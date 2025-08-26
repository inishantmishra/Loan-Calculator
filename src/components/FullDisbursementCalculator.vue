<template>
  <div class="container">
    <h1 class="text-2xl font-bold mb-4">Full Disbursement Loan Calculator</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="label">Loan Amount</label>
        <input v-model.number="loanAmount" class="input" type="number" />
      </div>
      <div>
        <label class="label">Loan Term (Months)</label>
        <input v-model.number="loanTerm" class="input" type="number" />
      </div>
      <div>
        <label class="label">Interest Rate (%)</label>
        <input v-model.number="interestRate" class="input" type="number" step="0.01" />
      </div>
    </div>
    
    <div>
        <label class="label">Comfortable Minimum EMI Per Month</label>
        <input v-model.number="comfortableEmi" class="input" type="number" />
    </div>

    <div class="mt-4">
      <label class="label">Monthly Extra Payment</label>
      <input v-model.number="monthlyExtra" class="input" type="number" />
    </div>

      <div>
        <label>EMI Increase Rate per Year (%)</label>
        <input v-model.number="emiIncreaseRate" type="number" class="input" />
      </div>

    <div class="mt-4">
      <label class="label">Lump Sum Payments (Recurring or One-Time)</label>
      <div class="grid grid-cols-5 gap-4" v-for="(lump, index) in lumpSums" :key="index">
        <input v-model.number="lump.month" class="input" type="number" placeholder="Start Month" />
        <input v-model.number="lump.amount" class="input" type="number" placeholder="Amount" />
        <select v-model="lump.recurring" class="input">
          <option :value="false">One-Time</option>
          <option :value="true">Recurring</option>
        </select>
        <input v-if="lump.recurring" v-model.number="lump.repeat" class="input" type="number" placeholder="Repeat Every N Months" />
        <button class="button delete-btn" @click="removeLumpSum(index)">Delete</button>
      </div>
      <button class="button" @click="addLumpSum">Add Lump Sum</button>
    </div>

    <button class="button mt-4" @click="calculatePlan">Calculate Plan</button>

    <div v-if="summary" class="summary-box">
      <div class="summary-item">Base Monthly EMI: ₹{{ summary.emi.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }}</div>
      <div class="summary-item">Original Loan Term: {{ Math.floor(loanTerm / 12) }} years {{ loanTerm % 12 }} months ({{ loanTerm }} months)</div>
      <div class="summary-item">Actual Loan Duration: {{ Math.floor(summary.duration / 12) }} years {{ summary.duration % 12 }} months ({{ summary.duration }} months)</div>
      <div class="summary-item">Months Saved: {{ summary.monthsSaved }} months</div>
      <div class="summary-item">Total Interest Paid: ₹{{ summary.totalInterest.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }}</div>
      <div class="summary-item">Interest Saved: ₹{{ summary.interestSaved ? summary.interestSaved.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 'Calculating...' }}</div>
    </div>

    <div class="chart-wrapper">
      <div class="chart-container">
        <canvas id="barChart"></canvas>
      </div>
      <div class="chart-container">
        <canvas id="lineChart"></canvas>
      </div>
    </div>

    <div class="mt-4">
      <button class="button" @click="downloadCSV">Download CSV</button>
    </div>

    <table class="table mt-6">
      <thead>
        <tr>
          <th>Month</th>
          <th>Type</th>
          <th>Scheduled EMI</th>
          <th>Interest</th>
          <th>Principal from EMI</th>
          <th>Prepayment</th>
          <th>Total Payment</th>
          <th>Outstanding Balance</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in schedule" :key="idx" :class="{ 'highlight-row': item.type === 'Prepayment', 'emi-row': item.type === 'EMI' }">
          <td>{{ item.month }}</td>
          <td class="type-cell">{{ item.type }}</td>
          <td>₹{{ item.scheduledEmi?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0' }}</td>
          <td>₹{{ item.interest?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0' }}</td>
          <td>₹{{ item.principalFromEmi?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0' }}</td>
          <td class="prepayment-cell">₹{{ item.prepayment?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0' }}</td>
          <td class="total-payment-cell">₹{{ item.totalPayment?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0' }}</td>
          <td>₹{{ item.balance?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import Chart from 'chart.js/auto';

const loanAmount = ref(1000000);
const loanTerm = ref(240);
const interestRate = ref(8.5);
const monthlyExtra = ref(0);
const comfortableEmi = ref(0)
const emiIncreaseRate = ref(0)
const lumpSums = ref([]);
const schedule = ref([]);
const summary = ref(null);
let barChart = null;
let lineChart = null;

function addLumpSum() {
  lumpSums.value.push({ month: 1, amount: 0, recurring: false, repeat: 0 });
}

function removeLumpSum(index) {
  lumpSums.value.splice(index, 1);
}

function calculateEMI(P, N, R) {
  const r = R / 12 / 100;
  return P * r * Math.pow(1 + r, N) / (Math.pow(1 + r, N) - 1);
}

function calculatePlan() {
  let balance = loanAmount.value;
  const baseEmi = calculateEMI(balance, loanTerm.value, interestRate.value);
  const result = [];
  let totalInterest = 0;
  let month = 1;
  const monthlyRate = interestRate.value / 12 / 100;

  while (month <= loanTerm.value * 2 && balance > 0.01) {
    // Calculate monthly interest on outstanding balance (Indian bank style)
    const interest = balance * monthlyRate;
    
    // Calculate EMI with yearly increase
    const yearFromStart = Math.floor((month - 1) / 12);
    const yearlyMultiplier = Math.pow(1 + (emiIncreaseRate.value / 100), yearFromStart);
    const adjustedBaseEmi = baseEmi * yearlyMultiplier;
    
    // Calculate principal component from scheduled EMI (Indian bank style)
    const scheduledEmiPrincipal = Math.max(0, adjustedBaseEmi - interest);
    
    // Calculate comfortable EMI with yearly increase
    let comfortableEmiAdjusted = (comfortableEmi.value || 0) * yearlyMultiplier;
    
    // Calculate total payment sources
    let totalPaymentFromAllSources = adjustedBaseEmi; // Start with base EMI
    
    // Add comfortable EMI if it's higher than base EMI
    if (comfortableEmiAdjusted > adjustedBaseEmi) {
      totalPaymentFromAllSources = comfortableEmiAdjusted;
    }
    
    // Add monthly extra payment
    if (monthlyExtra.value > 0) {
      totalPaymentFromAllSources += monthlyExtra.value;
    }
    
    // Add lump sum payments for this month
    let lumpSum = 0;
    lumpSums.value.forEach(ls => {
      if (ls.recurring && month >= ls.month && ls.repeat > 0 && (month - ls.month) % ls.repeat === 0) {
        lumpSum += ls.amount;
      } else if (!ls.recurring && ls.month === month) {
        lumpSum += ls.amount;
      }
    });
    
    totalPaymentFromAllSources += lumpSum;
    
    // Ensure total payment is never less than scheduled EMI
    totalPaymentFromAllSources = Math.max(totalPaymentFromAllSources, adjustedBaseEmi);
    
    // Calculate prepayment (Indian bank style - excess goes to principal)
    const prepayment = Math.max(0, totalPaymentFromAllSources - adjustedBaseEmi);
    
    // If remaining balance is less than total payment needed
    if (totalPaymentFromAllSources >= balance + interest) {
      const finalPayment = balance + interest;
      const finalPrincipal = balance;
      const finalPrepayment = Math.max(0, finalPayment - adjustedBaseEmi);
      
      // Scheduled EMI entry
      result.push({
        month,
        type: 'EMI',
        scheduledEmi: adjustedBaseEmi,
        interest,
        principalFromEmi: Math.min(scheduledEmiPrincipal, finalPrincipal),
        prepayment: 0,
        totalPayment: Math.min(adjustedBaseEmi, finalPayment),
        balance: Math.max(0, balance - Math.min(scheduledEmiPrincipal, finalPrincipal))
      });
      
      // Prepayment entry if any
      if (finalPrepayment > 0) {
        result.push({
          month,
          type: 'Prepayment',
          scheduledEmi: 0,
          interest: 0,
          principalFromEmi: 0,
          prepayment: finalPrepayment,
          totalPayment: finalPrepayment,
          balance: 0
        });
      }
      
      totalInterest += interest;
      break;
    }
    
    // Normal case: apply scheduled principal + prepayment to principal
    const totalPrincipalPayment = scheduledEmiPrincipal + prepayment;
    balance = Math.max(0, balance - totalPrincipalPayment);
    totalInterest += interest;
    
    // Scheduled EMI entry
    result.push({
      month,
      type: 'EMI',
      scheduledEmi: adjustedBaseEmi,
      interest,
      principalFromEmi: scheduledEmiPrincipal,
      prepayment: 0,
      totalPayment: adjustedBaseEmi,
      balance: Math.max(0, balance + prepayment)
    });
    
    // Prepayment entry if any
    if (prepayment > 0) {
      result.push({
        month,
        type: 'Prepayment',
        scheduledEmi: 0,
        interest: 0,
        principalFromEmi: 0,
        prepayment: prepayment,
        totalPayment: prepayment,
        balance: balance
      });
    }
    
    month++;
  }

  schedule.value = result;
  
  // Calculate duration from EMI entries only
  const lastEmiMonth = Math.max(...result.filter(r => r.type === 'EMI').map(r => r.month));
  
  // Calculate interest that would have been paid without prepayments
  const originalTotalInterest = (baseEmi * loanTerm.value) - loanAmount.value;
  const interestSaved = Math.max(0, originalTotalInterest - totalInterest);
  
  summary.value = {
    emi: baseEmi,
    totalInterest,
    duration: lastEmiMonth,
    monthsSaved: Math.max(0, loanTerm.value - lastEmiMonth),
    interestSaved
  };

  renderCharts(result);
}

function renderCharts(data) {
  const ctx1 = document.getElementById('barChart');
  const ctx2 = document.getElementById('lineChart');
  
  // Filter only EMI entries for chart data
  const emiEntries = data.filter(d => d.type === 'EMI');
  const prepaymentEntries = data.filter(d => d.type === 'Prepayment');
  
  const labels = emiEntries.map(d => `M${d.month}`);
  const principalFromEmi = emiEntries.map(d => d.principalFromEmi || 0);
  const interest = emiEntries.map(d => d.interest || 0);
  const prepayments = emiEntries.map(d => {
    const prepaymentInSameMonth = prepaymentEntries.find(p => p.month === d.month);
    return prepaymentInSameMonth ? prepaymentInSameMonth.prepayment : 0;
  });
  const balance = emiEntries.map(d => d.balance || 0);

  if (barChart) barChart.destroy();
  if (lineChart) lineChart.destroy();

  barChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Principal from EMI', data: principalFromEmi, backgroundColor: '#60a5fa' },
        { label: 'Interest', data: interest, backgroundColor: '#fcd34d' },
        { label: 'Prepayment', data: prepayments, backgroundColor: '#86efac' },
      ]
    },
    options: { responsive: true, plugins: { legend: { display: true } } }
  });

  lineChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Outstanding Balance', data: balance, borderColor: '#7c3aed', fill: false }]
    },
    options: { responsive: true }
  });
}

function downloadCSV() {
  let csv = 'Month,Type,Scheduled EMI,Interest,Principal from EMI,Prepayment,Total Payment,Outstanding Balance\n';
  schedule.value.forEach(r => {
    csv += `${r.month},${r.type},${r.scheduledEmi?.toFixed(2) || '0'},${r.interest?.toFixed(2) || '0'},${r.principalFromEmi?.toFixed(2) || '0'},${r.prepayment?.toFixed(2) || '0'},${r.totalPayment?.toFixed(2) || '0'},${r.balance?.toFixed(2) || '0'}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'full_loan_amortization_schedule.csv';
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.container {
  max-width: 900px;
  margin: auto;
  padding: 2rem;
  background-color: #f9fafb;
  border-radius: 1rem;
  box-shadow: 0 0 10px rgba(0,0,0,0.05);
}
.label {
  font-weight: 600;
  display: block;
  margin-bottom: 0.25rem;
}
.input {
  width: 100%;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  background-color: white;
}
.button {
  background-color: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.table th, .table td {
  border: 1px solid #e5e7eb;
  padding: 0.5rem;
  text-align: center;
}
.summary-box {
  background-color: #e0f2fe;
  padding: 1rem;
  border-radius: 0.75rem;
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}
.summary-item {
  font-weight: 600;
  font-size: 1rem;
}
.chart-wrapper {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 2rem;
}
.chart-container {
  background-color: white;
  padding: 1rem;
  border-radius: 0.75rem;
  box-shadow: 0 0 5px rgba(0,0,0,0.05);
}
.delete-btn {
  background-color: #ef4444;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}
.highlight-row {
  background-color: #dcfce7;
}
.emi-row {
  background-color: #f0f9ff;
}
.prepayment-cell {
  background-color: #dcfce7;
  font-weight: 600;
}
.total-payment-cell {
  background-color: #fef3c7;
  font-weight: 600;
}
.type-cell {
  font-weight: 600;
  font-size: 0.75rem;
}
</style>