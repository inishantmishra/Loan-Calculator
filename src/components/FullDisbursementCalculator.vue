<template>
  <div class="p-4 space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label>Loan Amount</label>
        <input v-model.number="loanAmount" type="number" class="input" />
      </div>
      <div>
        <label>Interest Rate (%)</label>
        <input v-model.number="interestRate" type="number" class="input" step="0.01" />
      </div>
      <div>
        <label>Loan Term (Months)</label>
        <input v-model.number="loanTerm" type="number" class="input" />
      </div>
      <div>
        <label>Comfortable Minimum EMI</label>
        <input v-model.number="comfortableEmi" type="number" class="input" />
      </div>
      <div>
        <label>Monthly Extra Payment</label>
        <input v-model.number="monthlyExtra" type="number" class="input" />
      </div>
      <div>
        <label>EMI Increase Rate per Year (%)</label>
        <input v-model.number="emiIncreaseRate" type="number" class="input" />
      </div>
    </div>

    <div>
      <h2 class="font-bold mt-4">Lump Sum Payments</h2>
      <button @click="addLumpSum" class="btn">Add Lump Sum</button>
      <div v-for="(lump, index) in lumpSums" :key="index" class="grid grid-cols-4 gap-2 mt-2">
        <input v-model.number="lump.month" type="number" placeholder="Month" class="input" />
        <input v-model.number="lump.amount" type="number" placeholder="Amount" class="input" />
        <label class="flex items-center space-x-2">
          <input type="checkbox" v-model="lump.recurring" /> <span>Recurring</span>
        </label>
        <input v-if="lump.recurring" v-model.number="lump.repeat" type="number" placeholder="Every x months" class="input" />
      </div>
    </div>

    <button @click="calculatePlan" class="btn mt-4">Calculate Plan</button>

    <div v-if="summary" class="mt-6 bg-blue-50 p-4 rounded shadow">
      <h3 class="font-bold text-lg mb-2">Summary</h3>
      <p>Monthly EMI: ₹{{ summary.lastEmi.toFixed(2) }}</p>
      <p>Total Interest: ₹{{ summary.totalInterest.toFixed(2) }}</p>
      <p>Total Duration: {{ summary.duration }} months</p>
      <p>Months Saved: {{ summary.monthsSaved }}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <canvas id="barChartFull"></canvas>
      <canvas id="lineChartFull"></canvas>
    </div>

    <button @click="downloadCSV" class="btn mt-4">Download Schedule CSV</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Chart from 'chart.js/auto'

const loanAmount = ref(1000000)
const interestRate = ref(8.5)
const loanTerm = ref(240)
const monthlyExtra = ref(0)
const comfortableEmi = ref(50000)
const emiIncreaseRate = ref(0)
const lumpSums = ref([])
const schedule = ref([])
const summary = ref(null)

const addLumpSum = () => {
  lumpSums.value.push({ month: 1, amount: 0, recurring: false, repeat: 0 })
}

const calculateEMI = (principal, rate, months) => {
  const monthlyRate = rate / 1200
  return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))
}

const calculatePlan = () => {
  schedule.value = []
  let balance = loanAmount.value
  let totalInterest = 0
  let month = 1
  let monthlyEMI = calculateEMI(balance, interestRate.value, loanTerm.value)

  while (month <= loanTerm.value * 2 && balance > 0) {
    const yearlyEMIBoost = Math.floor((month - 1) / 12) * (emiIncreaseRate.value / 100)
    const monthlyRate = interestRate.value / 1200
    let interest = balance * monthlyRate

    let effectiveEmi = Math.max(monthlyEMI, comfortableEmi.value)
    effectiveEmi *= (1 + yearlyEMIBoost)

    let lumpAmount = 0
    for (const l of lumpSums.value) {
      if (l.recurring && (month - l.month) % l.repeat === 0 && month >= l.month) {
        lumpAmount += l.amount
      } else if (!l.recurring && l.month === month) {
        lumpAmount += l.amount
      }
    }

    let extra = monthlyExtra.value
    let totalPayment = effectiveEmi + extra + lumpAmount
    let principal = totalPayment - interest
    balance = Math.max(0, balance - principal)
    totalInterest += interest

    schedule.value.push({
      month,
      emi: effectiveEmi,
      interest,
      principal,
      extra,
      lump: lumpAmount,
      balance
    })

    if (balance <= 0) break
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
  const barCtx = document.getElementById('barChartFull')
  const lineCtx = document.getElementById('lineChartFull')
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
  link.setAttribute('download', 'full_loan_schedule.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
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
.btn {
  background-color: #2563eb;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background-color 0.2s;
}
.btn:hover {
  background-color: #1d4ed8;
}
</style>