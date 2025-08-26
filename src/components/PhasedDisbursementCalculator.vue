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
      <div class="grid grid-cols-3 gap-4" v-for="(phase, index) in disbursements" :key="index">
        <input v-model.number="phase.month" class="input" type="number" placeholder="Disbursement Month" />
        <input v-model.number="phase.percent" class="input" type="number" placeholder="% of Loan" />
        <button class="button delete-btn" @click="removeDisbursement(index)">Delete</button>
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
      <button class="button mt-2" @click="addLumpSum">Add Lump Sum</button>
    </div>

    <button class="button mt-4" @click="calculatePlan">Calculate Plan</button>

    <div v-if="phaseSummaries.length" class="summary-box">
      <div v-for="(phase, i) in phaseSummaries" :key="i" class="summary-item">
        <p><strong>Phase {{ i + 1 }} (Month {{ phase.month }})</strong></p>
        <p>Amount: ₹{{ phase.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }}</p>
        <p>Remaining Tenure: {{ phase.remainingTenure }} months</p>
        <p>Phase EMI: ₹{{ phase.emi.toLocaleString('en-IN', { maximumFractionDigits: 0 }) }}</p>
      </div>
    </div>

    <div v-if="summary" class="summary-box">
      <div class="summary-item">Total Loan Amount: ₹{{ summary.totalDisbursed?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || 'N/A' }}</div>
      <div class="summary-item">Original Loan Term: {{ Math.floor(loanTerm / 12) }} years {{ loanTerm % 12 }} months ({{ loanTerm }} months)</div>
      <div class="summary-item">Final Combined EMI: ₹{{ summary.baseEmi?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || 'N/A' }}</div>
      <div class="summary-item">Actual Loan Duration: {{ Math.floor(summary.duration / 12) }} years {{ summary.duration % 12 }} months ({{ summary.duration }} months)</div>
      <div class="summary-item">Months Saved: {{ summary.monthsSaved }} months</div>
      <div class="summary-item">Total Interest Paid: ₹{{ summary.totalInterest?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || 'N/A' }}</div>
      <div class="summary-item">Interest Saved: ₹{{ summary.interestSaved?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || 'N/A' }}</div>
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
import { ref } from 'vue'
import Chart from 'chart.js/auto'

const approvedLoanAmount = ref(1000000)
const loanTerm = ref(240)
const interestRate = ref(8.5)
const comfortableEmi = ref(0)
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

const removeDisbursement = (index) => {
  disbursements.value.splice(index, 1)
}

const addLumpSum = () => {
  lumpSums.value.push({ month: 1, amount: 0, recurring: false, repeat: 0 })
}

const removeLumpSum = (index) => {
  lumpSums.value.splice(index, 1)
}

const calculateEMI = (principal, rate, months) => {
  const r = rate / 12 / 100
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1)
}

const calculatePlan = () => {
  schedule.value = []
  phaseSummaries.value = []
  
  if (!disbursements.value.length) return
  
  // Sort disbursements by month
  const sortedDisbursements = [...disbursements.value].sort((a, b) => a.month - b.month)
  
  let totalInterest = 0
  let month = 1
  let currentBalance = 0
  let currentTotalEMI = 0
  const monthlyRate = interestRate.value / 12 / 100
  
  // Calculate phase summaries
  let cumulativeDisbursed = 0
  for (const phase of sortedDisbursements) {
    const phaseAmount = approvedLoanAmount.value * phase.percent / 100
    cumulativeDisbursed += phaseAmount
    const remainingTenure = loanTerm.value - (phase.month - 1)
    const phaseEMI = calculateEMI(phaseAmount, interestRate.value, remainingTenure)
    
    phaseSummaries.value.push({
      month: phase.month,
      amount: phaseAmount,
      cumulativeAmount: cumulativeDisbursed,
      emi: phaseEMI,
      remainingTenure
    })
  }

  const maxPhaseMonth = Math.max(...sortedDisbursements.map(p => p.month))
  
  while (month <= loanTerm.value * 2 && (currentBalance > 0.01 || month <= maxPhaseMonth)) {
    // Check for new disbursement this month
    const disbursementThisMonth = sortedDisbursements.find(d => d.month === month)
    if (disbursementThisMonth) {
      const phaseAmount = approvedLoanAmount.value * disbursementThisMonth.percent / 100
      currentBalance += phaseAmount
      
      // Calculate EMI for this new phase
      const remainingTenure = loanTerm.value - (month - 1)
      const newPhaseEMI = calculateEMI(phaseAmount, interestRate.value, remainingTenure)
      currentTotalEMI += newPhaseEMI
    }

    // Skip months before first disbursement
    if (currentBalance === 0) {
      month++
      continue
    }

    // Calculate interest on outstanding balance (Indian bank style)
    const interest = currentBalance * monthlyRate
    
    // Calculate EMI with yearly increase
    const yearFromStart = Math.floor((month - 1) / 12)
    const yearlyMultiplier = Math.pow(1 + (emiIncreaseRate.value / 100), yearFromStart)
    const adjustedBaseEMI = currentTotalEMI * yearlyMultiplier
    
    // Calculate principal from scheduled EMI
    const scheduledEmiPrincipal = Math.max(0, adjustedBaseEMI - interest)
    
    // Calculate comfortable EMI with yearly increase
    let comfortableEmiAdjusted = (comfortableEmi.value || 0) * yearlyMultiplier
    
    // Calculate total payment from all sources
    let totalPaymentFromAllSources = adjustedBaseEMI
    
    if (comfortableEmiAdjusted > adjustedBaseEMI) {
      totalPaymentFromAllSources = comfortableEmiAdjusted
    }
    
    // Add monthly extra payment
    if (monthlyExtra.value > 0) {
      totalPaymentFromAllSources += monthlyExtra.value
    }
    
    // Add lump sum payments
    let lumpSum = 0
    lumpSums.value.forEach(ls => {
      if (ls.recurring && month >= ls.month && ls.repeat > 0 && (month - ls.month) % ls.repeat === 0) {
        lumpSum += ls.amount
      } else if (!ls.recurring && ls.month === month) {
        lumpSum += ls.amount
      }
    })
    
    totalPaymentFromAllSources += lumpSum
    totalPaymentFromAllSources = Math.max(totalPaymentFromAllSources, adjustedBaseEMI)
    
    // Calculate prepayment
    const prepayment = Math.max(0, totalPaymentFromAllSources - adjustedBaseEMI)
    
    // Handle final payment
    if (totalPaymentFromAllSources >= currentBalance + interest) {
      const finalPayment = currentBalance + interest
      const finalPrincipal = currentBalance
      const finalPrepayment = Math.max(0, finalPayment - adjustedBaseEMI)
      
      // Scheduled EMI entry
      schedule.value.push({
        month,
        type: 'EMI',
        scheduledEmi: adjustedBaseEMI,
        interest,
        principalFromEmi: Math.min(scheduledEmiPrincipal, finalPrincipal),
        prepayment: 0,
        totalPayment: Math.min(adjustedBaseEMI, finalPayment),
        balance: Math.max(0, currentBalance - Math.min(scheduledEmiPrincipal, finalPrincipal))
      })
      
      // Prepayment entry if any
      if (finalPrepayment > 0) {
        schedule.value.push({
          month,
          type: 'Prepayment',
          scheduledEmi: 0,
          interest: 0,
          principalFromEmi: 0,
          prepayment: finalPrepayment,
          totalPayment: finalPrepayment,
          balance: 0
        })
      }
      
      totalInterest += interest
      break
    }
    
    // Normal case
    const totalPrincipalPayment = scheduledEmiPrincipal + prepayment
    currentBalance = Math.max(0, currentBalance - totalPrincipalPayment)
    totalInterest += interest
    
    // Scheduled EMI entry
    schedule.value.push({
      month,
      type: 'EMI',
      scheduledEmi: adjustedBaseEMI,
      interest,
      principalFromEmi: scheduledEmiPrincipal,
      prepayment: 0,
      totalPayment: adjustedBaseEMI,
      balance: Math.max(0, currentBalance + prepayment)
    })
    
    // Prepayment entry if any
    if (prepayment > 0) {
      schedule.value.push({
        month,
        type: 'Prepayment',
        scheduledEmi: 0,
        interest: 0,
        principalFromEmi: 0,
        prepayment: prepayment,
        totalPayment: prepayment,
        balance: currentBalance
      })
    }
    
    month++
  }

  // Calculate interest savings
  const lastScheduleMonth = Math.max(...schedule.value.filter(s => s.type === 'EMI').map(s => s.month))
  const originalTotalInterest = (currentTotalEMI * loanTerm.value) - cumulativeDisbursed
  const interestSaved = Math.max(0, originalTotalInterest - totalInterest)
  
  summary.value = {
    baseEmi: currentTotalEMI,
    totalInterest,
    duration: lastScheduleMonth,
    monthsSaved: Math.max(0, loanTerm.value - lastScheduleMonth),
    interestSaved,
    totalDisbursed: cumulativeDisbursed
  }

  drawCharts()
}

const drawCharts = () => {
  const barCtx = document.getElementById('barChart')
  const lineCtx = document.getElementById('lineChart')
  if (barCtx.chart) barCtx.chart.destroy()
  if (lineCtx.chart) lineCtx.chart.destroy()

  // Filter only EMI entries for chart data
  const emiEntries = schedule.value.filter(x => x.type === 'EMI')
  const prepaymentEntries = schedule.value.filter(x => x.type === 'Prepayment')
  
  const months = emiEntries.map(x => `M${x.month}`)
  const principalFromEmi = emiEntries.map(x => x.principalFromEmi || 0)
  const interest = emiEntries.map(x => x.interest || 0)
  const prepayments = emiEntries.map(x => {
    const prepaymentInSameMonth = prepaymentEntries.find(p => p.month === x.month)
    return prepaymentInSameMonth ? prepaymentInSameMonth.prepayment : 0
  })
  const balances = emiEntries.map(x => x.balance || 0)

  barCtx.chart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Principal from EMI', data: principalFromEmi, backgroundColor: '#60a5fa' },
        { label: 'Interest', data: interest, backgroundColor: '#fcd34d' },
        { label: 'Prepayment', data: prepayments, backgroundColor: '#86efac' }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } } }
  })

  lineCtx.chart = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{ label: 'Outstanding Balance', data: balances, borderColor: '#7c3aed', borderWidth: 2, fill: false }]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } } }
  })
}

const downloadCSV = () => {
  let csv = 'Month,Type,Scheduled EMI,Interest,Principal from EMI,Prepayment,Total Payment,Outstanding Balance\n'
  schedule.value.forEach(r => {
    csv += `${r.month},${r.type},${r.scheduledEmi?.toFixed(2) || '0'},${r.interest?.toFixed(2) || '0'},${r.principalFromEmi?.toFixed(2) || '0'},${r.prepayment?.toFixed(2) || '0'},${r.totalPayment?.toFixed(2) || '0'},${r.balance?.toFixed(2) || '0'}\n`
  })

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'phased_loan_schedule.csv'
  a.click()
  URL.revokeObjectURL(url)
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