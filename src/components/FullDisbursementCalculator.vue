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
      <div class="grid grid-cols-4 gap-4" v-for="(lump, index) in lumpSums" :key="index">
        <input v-model.number="lump.month" class="input" type="number" placeholder="Start Month" />
        <input v-model.number="lump.amount" class="input" type="number" placeholder="Amount" />
        <select v-model="lump.recurring" class="input">
          <option :value="false">One-Time</option>
          <option :value="true">Recurring</option>
        </select>
        <input v-if="lump.recurring" v-model.number="lump.repeat" class="input" type="number" placeholder="Repeat Every N Months" />
      </div>
      <button class="button" @click="addLumpSum">Add Lump Sum</button>
    </div>

    <button class="button mt-4" @click="calculatePlan">Calculate Plan</button>

    <div v-if="summary" class="summary-box">
      <div class="summary-item">Monthly EMI: ₹{{ summary.emi.toFixed(2) }}</div>
      <div class="summary-item">Total Interest: ₹{{ summary.totalInterest.toFixed(2) }}</div>
      <div class="summary-item">Loan Duration: {{ summary.duration }} months</div>
      <div class="summary-item">Months Saved: {{ summary.monthsSaved }}</div>
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
          <th>EMI</th>
          <th>Principal</th>
          <th>Interest</th>
          <th>Extra</th>
          <th>Lump Sum</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in schedule" :key="idx">
          <td>{{ item.month }}</td>
          <td>{{ item.emi.toFixed(2) }}</td>
          <td>{{ item.principal.toFixed(2) }}</td>
          <td>{{ item.interest.toFixed(2) }}</td>
          <td>{{ item.extra.toFixed(2) }}</td>
          <td>{{ item.lump.toFixed(2) }}</td>
          <td>{{ item.balance.toFixed(2) }}</td>
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
const comfortableEmi = ref(50000)
const emiIncreaseRate = ref(0)
const lumpSums = ref([{ month: 12, amount: 50000, recurring: false, repeat: 0 }]);
const schedule = ref([]);
const summary = ref(null);
let barChart = null;
let lineChart = null;

function addLumpSum() {
  lumpSums.value.push({ month: 1, amount: 0, recurring: false, repeat: 0 });
}

function calculateEMI(P, N, R) {
  const r = R / 12 / 100;
  return P * r * Math.pow(1 + r, N) / (Math.pow(1 + r, N) - 1);
}

function calculatePlan() {
  let balance = loanAmount.value;
  const emi = calculateEMI(balance, loanTerm.value, interestRate.value);
  const result = [];
  let totalInterest = 0;
  let month = 1;

 while (month <= loanTerm.value * 2 && balance > 0) {
    const yearlyEMIBoost = Math.floor((month - 1) / 12) * (emiIncreaseRate.value / 100)
    const r = interestRate.value / 12 / 100;
    const interest = balance * r;

    let effectiveEmi = Math.max(emi, comfortableEmi.value)
    effectiveEmi *= (1 + yearlyEMIBoost)

    let principal = effectiveEmi - interest;
    const extra = monthlyExtra.value;
    let lump = 0;

    lumpSums.value.forEach(ls => {
      if (ls.recurring && (month - ls.month) % ls.repeat === 0 && month >= ls.month) {
        lump += ls.amount;
      } else if (!ls.recurring && ls.month === month) {
        lump += ls.amount;
      }
    });

    if (principal + extra + lump > balance) {
      principal = balance;
    }

    const totalPayment = principal + extra + lump;
    balance -= totalPayment;
    totalInterest += interest;

    result.push({
      month,
      emi,
      principal,
      interest,
      extra,
      lump,
      balance: balance > 0 ? balance : 0,
    });
    month++;
  }

  schedule.value = result;
  summary.value = {
    emi,
    totalInterest,
    duration: result.length,
    monthsSaved: loanTerm.value - result.length
  };

  renderCharts(result);
}

function renderCharts(data) {
  const ctx1 = document.getElementById('barChart');
  const ctx2 = document.getElementById('lineChart');
  const labels = data.map(d => `M${d.month}`);

  const principal = data.map(d => d.principal);
  const interest = data.map(d => d.interest);
  const extra = data.map(d => d.extra);
  const lump = data.map(d => d.lump);
  const balance = data.map(d => d.balance);

  if (barChart) barChart.destroy();
  if (lineChart) lineChart.destroy();

  barChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Principal', data: principal, backgroundColor: '#60a5fa' },
        { label: 'Interest', data: interest, backgroundColor: '#fcd34d' },
        { label: 'Extra', data: extra, backgroundColor: '#86efac' },
        { label: 'Lump Sum', data: lump, backgroundColor: '#f87171' },
      ]
    },
    options: { responsive: true, stacked: true }
  });

  lineChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Outstanding Balance', data: balance, borderColor: '#7c3aed' }]
    },
    options: { responsive: true }
  });
}

function downloadCSV() {
  let csv = 'Month,EMI,Principal,Interest,Extra,Lump Sum,Balance\n';
  schedule.value.forEach(r => {
    csv += `${r.month},${r.emi.toFixed(2)},${r.principal.toFixed(2)},${r.interest.toFixed(2)},${r.extra.toFixed(2)},${r.lump.toFixed(2)},${r.balance.toFixed(2)}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'amortization_schedule.csv';
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
</style>