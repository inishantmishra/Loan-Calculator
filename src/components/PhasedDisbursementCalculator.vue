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
      <div>
        <label class="label">Interest Rate (%)</label>
        <input v-model.number="interestRate" class="input" type="number" step="0.01" />
      </div>
      <div>
        <label class="label">Comfortable Minimum EMI Per Month</label>
        <input v-model.number="comfortableEmi" class="input" type="number" />
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
import { ref } from 'vue'
import Chart from 'chart.js/auto'

const approvedLoanAmount = ref(1000000)
const loanTerm = ref(240)
const interestRate = ref(8.5)
const comfortableEmi = ref(50000)
const monthlyExtra = ref(0)
const emiIncreaseRate = ref(0)

const disbursements = ref([{ month: 1, percent: 35 }])
const lumpSums = ref([])
const phaseSummaries = ref([])
const schedule = ref([])
const summary = ref(null)

const addDisbursement = () => {
  disbursements.value.push({ month: 1, percent: 0 })
}

const addLumpSum = () => {
  lumpSums.value.push({ month: 1, amount: 0, recurring: false, repeat: 0 })
}

const calculateEMI = (principal, rate, months) => {
  const monthlyRate = rate / 1200
  return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))
}

const calculatePlan = () => {
  schedule.value = []
  phaseSummaries.value = []
  let balance = 0
  let totalInterest = 0
  let month = 1
  let currentEMI = 0
  let disbursed = 0
  let emiMap = new Map()
  let totalLoan = approvedLoanAmount.value
  let disbursedPhases = [...disbursements.value].sort((a, b) => a.month - b.month)

  const emiMapGenerator = () => {
    for (const phase of disbursedPhases) {
      let phaseAmount = totalLoan * phase.percent / 100
      disbursed += phaseAmount
      currentEMI = calculateEMI(disbursed, interestRate.value, loanTerm.value)
      emiMap.set(phase.month, { emi: currentEMI, disbursed: disbursed })
      phaseSummaries.value.push({
        month: phase.month,
        amount: disbursed,
        emi: currentEMI
      })
    }
  }

  emiMapGenerator()

  let currentBalance = 0
  let monthlyEMI = 0
  let currentPhaseIdx = 0
  
  // Track the maximum month from all phases to ensure we don't exit early
  const maxPhaseMonth = Math.max(...disbursedPhases.map(phase => phase.month));
  
  // Continue until we've processed all phases and paid off the balance
  while (month <= loanTerm.value * 2 && (currentBalance > 0 || month <= maxPhaseMonth)) {
    const yearlyEMIBoost = Math.floor((month - 1) / 12) * (emiIncreaseRate.value / 100)
    
    // Check if there's a disbursement for this month
    if (emiMap.has(month)) {
      monthlyEMI = emiMap.get(month).emi
      // Update the current balance with the new disbursement amount
      currentBalance = emiMap.get(month).disbursed
      currentPhaseIdx++
    }

    const monthlyRate = interestRate.value / 1200
    let interest = currentBalance * monthlyRate
    let actualEMI = Math.max(monthlyEMI, comfortableEmi.value)
    actualEMI *= (1 + yearlyEMIBoost)
    
    let lumpAmount = 0
    for (const l of lumpSums.value) {
      if (l.recurring && (month - l.month) % l.repeat === 0 && month >= l.month) {
        lumpAmount += l.amount
      } else if (!l.recurring && l.month === month) {
        lumpAmount += l.amount
      }
    }

    let extra = monthlyExtra.value
    let totalPayment = actualEMI + extra + lumpAmount
    let principal = totalPayment - interest
    currentBalance = Math.max(0, currentBalance - principal)
    totalInterest += interest

    schedule.value.push({
      month,
      emi: actualEMI,
      interest,
      principal,
      extra,
      lump: lumpAmount,
      balance: currentBalance
    })

    // Only break if balance is 0 AND we've processed all phases
    if (currentBalance <= 0 && month > maxPhaseMonth) break
    month++
  }

  const savedMonths = loanTerm.value - schedule.value.length
  summary.value = {
    lastEmi: monthlyEMI,
    totalInterest,
    duration: schedule.value.length,
    monthsSaved: savedMonths > 0 ? savedMonths : 0
  }

  drawCharts()
}

const drawCharts = () => {
  const barCtx = document.getElementById('barChart')
  const lineCtx = document.getElementById('lineChart')
  if (barCtx.chart) barCtx.chart.destroy()
  if (lineCtx.chart) lineCtx.chart.destroy()

  const months = schedule.value.map(x => x.month)
  const principal = schedule.value.map(x => x.principal)
  const interest = schedule.value.map(x => x.interest)
  const extra = schedule.value.map(x => x.extra)
  const lump = schedule.value.map(x => x.lump)
  const balances = schedule.value.map(x => x.balance)

  barCtx.chart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Principal', data: principal, backgroundColor: '#7FC8F8' },
        { label: 'Interest', data: interest, backgroundColor: '#FFB6B9' },
        { label: 'Extra', data: extra, backgroundColor: '#FFDAC1' },
        { label: 'Lump Sum', data: lump, backgroundColor: '#E2F0CB' }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } } }
  })

  lineCtx.chart = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{ label: 'Outstanding Balance', data: balances, borderColor: '#0369A1', borderWidth: 2 }]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } } }
  })
}

const downloadCSV = () => {
  const headers = ['Month', 'EMI', 'Principal', 'Interest', 'Extra', 'Lump Sum', 'Balance']
  const rows = schedule.value.map(row => [row.month, row.emi, row.principal, row.interest, row.extra, row.lump, row.balance])
  let csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', 'loan_schedule.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style scoped>
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
}
.label {
  font-weight: 600;
  margin-bottom: 4px;
  display: block;
}
.input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
}
.button {
  background-color: #2563eb;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 600;
}
.summary-box {
  display: flex;
  flex-wrap: wrap;
  margin-top: 20px;
  gap: 20px;
}
.summary-item {
  background: #f0f9ff;
  padding: 10px 20px;
  border-radius: 0.5rem;
  box-shadow: 0 0 5px rgba(0,0,0,0.1);
}
.table {
  width: 100%;
  border-collapse: collapse;
}
.table th, .table td {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  text-align: center;
}
.chart-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}
.chart-container {
  flex: 1 1 45%;
  background: #fff;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 0 5px rgba(0,0,0,0.05);
}
</style>