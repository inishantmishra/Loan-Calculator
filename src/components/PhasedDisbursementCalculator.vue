<template>
  <div class="container">
    <h1 class="text-2xl font-bold mb-4">Phased Disbursement Calculator</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="label">Approved Loan Amount</label>
        <input v-model.number="approvedLoanAmount" class="input" type="number" />
      </div>
      <div>
        <label class="label">Loan Term (Months)</label>
        <input v-model.number="loanTerm" class="input" type="number" />
      </div>
      <div class="col-span-2">
        <label class="label">Interest Rate (%)</label>
        <input v-model.number="interestRate" class="input" type="number" step="0.01" />
      </div>
    </div>

    <div class="mt-4">
      <h2 class="text-lg font-semibold">Disbursement Phases</h2>
      <div class="grid grid-cols-2 gap-4" v-for="(phase, index) in disbursements" :key="index">
        <input v-model.number="phase.month" class="input" type="number" placeholder="Disbursement Month" />
        <input v-model.number="phase.percent" class="input" type="number" placeholder="% of Loan" />
      </div>
      <button class="button mt-2" @click="addDisbursement">Add Phase</button>
    </div>

    <div class="mt-4">
      <label class="label">Monthly Extra Payment</label>
      <input v-model.number="monthlyExtra" class="input" type="number" />
    </div>

    <div class="mt-4">
      <label class="label">Lump Sum Payments (Recurring or One-Time)</label>
      <div class="grid grid-cols-3 gap-4" v-for="(lump, index) in lumpSums" :key="index">
        <input v-model.number="lump.month" class="input" type="number" placeholder="Month" />
        <input v-model.number="lump.amount" class="input" type="number" placeholder="Amount" />
        <input v-model.number="lump.repeat" class="input" type="number" placeholder="Repeat every N months (0 for once)" />
      </div>
      <button class="button mt-2" @click="addLumpSum">Add Lump Sum</button>
    </div>

    <button class="button mt-4" @click="calculatePlan">Calculate Plan</button>

    <div v-if="phaseSummaries.length" class="summary-box">
      <div v-for="(phase, i) in phaseSummaries" :key="i" class="summary-item">
        <p><strong>Phase {{ i + 1 }}</strong></p>
        <p>Disbursed: ₹{{ phase.amount.toFixed(0) }}</p>
        <p>Month: {{ phase.month }}</p>
        <p>EMI: ₹{{ phase.emi.toFixed(2) }}</p>
      </div>
    </div>

    <div v-if="summary" class="summary-box">
      <div class="summary-item">Final EMI: ₹{{ summary.lastEmi.toFixed(2) }}</div>
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
import { ref } from 'vue';
import Chart from 'chart.js/auto';

const approvedLoanAmount = ref(0);
const loanTerm = ref(240);
const interestRate = ref(8);
const disbursements = ref([{ month: 1, percent: 35 }]);
const monthlyExtra = ref(0);
const lumpSums = ref([]);

const phaseSummaries = ref([]);
const summary = ref(null);
const schedule = ref([]);

function addDisbursement() {
  disbursements.value.push({ month: 1, percent: 0 });
}

function addLumpSum() {
  lumpSums.value.push({ month: 1, amount: 0, repeat: 0 });
}

function calculatePlan() {
  const phases = [...disbursements.value]
    .sort((a, b) => a.month - b.month)
    .map(p => ({ ...p, amount: (approvedLoanAmount.value * p.percent) / 100 }));

  let principal = 0;
  let balance = 0;
  let emi = 0;
  let emiStartMonth = 1;
  let currentPhase = 0;
  let totalInterest = 0;
  let results = [];
  phaseSummaries.value = [];

  for (let month = 1; month <= loanTerm.value; month++) {
    const disbursement = phases.find(p => p.month === month);
    if (disbursement) {
      principal += disbursement.amount;
      balance += disbursement.amount;
      emi = calculateEMI(principal, interestRate.value, loanTerm.value - month + 1);
      emiStartMonth = month;
      phaseSummaries.value.push({ ...disbursement, emi, amount: disbursement.amount });
    }

    let interest = balance * (interestRate.value / 1200);
    let principalPart = emi - interest;
    let extra = monthlyExtra.value;

    let lumpSum = lumpSums.value
      .filter(l => l.month === month || (l.repeat > 0 && (month - l.month) % l.repeat === 0 && month >= l.month))
      .reduce((sum, l) => sum + l.amount, 0);

    let totalPrincipalPayment = principalPart + extra + lumpSum;
    balance = Math.max(0, balance - totalPrincipalPayment);

    results.push({
      month,
      emi,
      principal: principalPart,
      interest,
      extra,
      lump: lumpSum,
      balance
    });

    totalInterest += interest;
    if (balance <= 0) break;
  }

  schedule.value = results;
  summary.value = {
    lastEmi: emi,
    totalInterest,
    duration: results.length,
    monthsSaved: loanTerm.value - results.length
  };

  renderCharts(results);
}

function calculateEMI(principal, rate, months) {
  const r = rate / 1200;
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

function renderCharts(data) {
  const ctxBar = document.getElementById('barChart');
  const ctxLine = document.getElementById('lineChart');

  if (window.barChart) window.barChart.destroy();
  if (window.lineChart) window.lineChart.destroy();

  const labels = data.map(d => `M${d.month}`);

  window.barChart = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Principal', data: data.map(d => d.principal), backgroundColor: '#60a5fa' },
        { label: 'Interest', data: data.map(d => d.interest), backgroundColor: '#facc15' },
        { label: 'Extra', data: data.map(d => d.extra), backgroundColor: '#34d399' },
        { label: 'Lump Sum', data: data.map(d => d.lump), backgroundColor: '#f472b6' },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { x: { stacked: true }, y: { stacked: true } }
    }
  });

  window.lineChart = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Outstanding Balance',
          data: data.map(d => d.balance),
          borderColor: '#818cf8',
          backgroundColor: '#c7d2fe',
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function downloadCSV() {
  const headers = ['Month', 'EMI', 'Principal', 'Interest', 'Extra', 'Lump Sum', 'Balance'];
  const rows = schedule.value.map(row => [
    row.month,
    row.emi.toFixed(2),
    row.principal.toFixed(2),
    row.interest.toFixed(2),
    row.extra.toFixed(2),
    row.lump.toFixed(2),
    row.balance.toFixed(2)
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'phased_schedule.csv';
  link.click();
}
</script>

<style scoped>
.container {
  padding: 2rem;
  background: #f8fafc;
  color: #1f2937;
}
.label {
  font-weight: 600;
  margin-bottom: 4px;
  display: block;
}
.input {
  padding: 0.5rem;
  border-radius: 0.5rem;
  width: 100%;
  border: 1px solid #d1d5db;
}
.button {
  background: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
}
.summary-box {
  margin-top: 1rem;
  background: #e0f2fe;
  padding: 1rem;
  border-radius: 0.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.summary-item {
  font-size: 0.95rem;
}
.table {
  width: 100%;
  border-collapse: collapse;
}
.table th, .table td {
  border: 1px solid #d1d5db;
  padding: 0.5rem;
  text-align: center;
}
.chart-wrapper {
  margin-top: 2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}
.chart-container {
  background: white;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>

