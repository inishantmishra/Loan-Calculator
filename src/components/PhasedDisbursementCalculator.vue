<template>
  <div class="container">
    <h1 class="text-2xl font-bold mb-4">Phased Disbursement Calculator</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label class="label">Total Flat Amount</label>
        <input v-model.number="totalFlatAmount" class="input" type="number" />
      </div>
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
      <div>
        <label class="label">Input Mode</label>
        <select v-model="inputMode" class="input">
          <option value="percentage">Percentage Mode</option>
          <option value="amount">Amount Mode</option>
        </select>
      </div>
    </div>

    <div class="mt-4">
      <h2 class="text-lg font-semibold mb-4">Disbursement Phases</h2>
      <div class="phase-container" v-for="(phase, index) in disbursements" :key="index">
        <div class="phase-header">
          <h3 class="font-medium">Phase {{ index + 1 }}</h3>
          <button class="button delete-btn" @click="removeDisbursement(index)">Delete</button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div>
            <label class="label-sm">Month</label>
            <input v-model.number="phase.month" class="input" type="number" placeholder="Month" />
          </div>
          <div>
            <label class="label-sm">Builder Demand ({{ inputMode === 'percentage' ? '%' : '₹' }})</label>
            <input 
              v-model.number="phase.builderDemand" 
              class="input" 
              type="number" 
              :placeholder="inputMode === 'percentage' ? 'Builder %' : 'Amount'" 
              @input="handlePhaseInput(index)"
            />
          </div>
          <div>
            <label class="label-sm">Self Contribution ({{ inputMode === 'percentage' ? '%' : '₹' }})</label>
            <input 
              v-model.number="phase.selfContribution" 
              class="input" 
              type="number" 
              :placeholder="inputMode === 'percentage' ? 'Self %' : 'Amount'" 
              @input="handlePhaseInput(index)"
            />
          </div>
          <div>
            <label class="label-sm">Bank Loan ({{ inputMode === 'percentage' ? '%' : '₹' }})</label>
            <input 
              v-model.number="phase.bankLoan" 
              class="input" 
              type="number" 
              :placeholder="inputMode === 'percentage' ? 'Bank %' : 'Amount'" 
              readonly
              :class="'readonly-input'"
            />
          </div>
        </div>
        <div class="phase-info mt-2" v-if="totalFlatAmount > 0">
          <div class="info-grid">
            <span><strong>Builder:</strong> {{ formatCurrency(phase.builderDemandAmount || 0) }} ({{ (phase.builderDemandPercent || 0).toFixed(1) }}%)</span>
            <span><strong>Self:</strong> {{ formatCurrency(phase.selfContributionAmount || 0) }} ({{ (phase.selfContributionPercent || 0).toFixed(1) }}%)</span>
            <span><strong>Bank:</strong> {{ formatCurrency(phase.bankLoanAmount || 0) }} ({{ (phase.bankLoanPercent || 0).toFixed(1) }}%)</span>
          </div>
        </div>
      </div>
      <button class="button mt-2" @click="addDisbursement">Add Phase</button>
      
      <div class="validation-summary mt-4" v-if="disbursements.length > 0 && totalFlatAmount > 0">
        <h3 class="font-medium mb-2">Validation Summary:</h3>
        <div class="validation-grid">
          <div :class="[totalPhasePercentage === 100 ? 'text-green-600' : 'text-red-600']">
            <strong>Total Phases Coverage:</strong> {{ totalPhasePercentage.toFixed(1) }}% of flat cost
          </div>
          <div :class="[totalBankLoanUsed <= approvedLoanAmount ? 'text-green-600' : 'text-red-600']">
            <strong>Loan Utilization:</strong> {{ formatCurrency(totalBankLoanUsed) }} / {{ formatCurrency(approvedLoanAmount) }}
          </div>
        </div>
      </div>
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
        <p>Builder Demand: {{ formatCurrency(phase.builderDemandAmount) }}</p>
        <p>Self Paid: {{ formatCurrency(phase.selfContributionAmount) }}</p>
        <p>Bank Loan: {{ formatCurrency(phase.bankLoanAmount) }}</p>
        <p>Phase EMI: {{ formatCurrency(phase.emi) }}</p>
        <p>Remaining Tenure: {{ phase.remainingTenure }} months</p>
      </div>
    </div>
    
    <div v-if="summary" class="summary-box mt-4">
      <div class="summary-item">
        <p><strong>Loan Balances</strong></p>
        <p>Approved Loan: {{ formatCurrency(approvedLoanAmount) }}</p>
        <p>Loan Used: {{ formatCurrency(totalBankLoanUsed) }}</p>
        <p>Loan Remaining: {{ formatCurrency(approvedLoanAmount - totalBankLoanUsed) }}</p>
      </div>
      <div class="summary-item">
        <p><strong>Property Balances</strong></p>
        <p>Total Flat Cost: {{ formatCurrency(totalFlatAmount) }}</p>
        <p>Amount Paid: {{ formatCurrency(summary.totalPaid) }}</p>
        <p>Amount Remaining: {{ formatCurrency(totalFlatAmount - summary.totalPaid) }}</p>
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
import { ref, computed } from 'vue'
import Chart from 'chart.js/auto'

const totalFlatAmount = ref(10000000)
const approvedLoanAmount = ref(8000000)
const loanTerm = ref(240)
const interestRate = ref(8.5)
const comfortableEmi = ref(0)
const monthlyExtra = ref(0)
const emiIncreaseRate = ref(0)
const inputMode = ref('percentage')

const disbursements = ref([{ 
  month: 1, 
  builderDemand: 35, 
  selfContribution: 17, 
  bankLoan: 18,
  builderDemandAmount: 0,
  selfContributionAmount: 0,
  bankLoanAmount: 0,
  builderDemandPercent: 0,
  selfContributionPercent: 0,
  bankLoanPercent: 0
}])

const totalPhasePercentage = computed(() => {
  try {
    return disbursements.value.reduce((sum, phase) => {
      const percentage = parseFloat(phase.builderDemandPercent) || 0
      return sum + percentage
    }, 0)
  } catch (error) {
    console.error('Error calculating totalPhasePercentage:', error)
    return 0
  }
})

const totalBankLoanUsed = computed(() => {
  try {
    return disbursements.value.reduce((sum, phase) => {
      const amount = parseFloat(phase.bankLoanAmount) || 0
      return sum + amount
    }, 0)
  } catch (error) {
    console.error('Error calculating totalBankLoanUsed:', error)
    return 0
  }
})
const lumpSums = ref([])
const phaseSummaries = ref([])
const schedule = ref([])
const summary = ref(null)

const addDisbursement = () => {
  const newPhase = {
    month: 1,
    builderDemand: '',
    selfContribution: '',
    bankLoan: 0,
    builderDemandAmount: 0,
    selfContributionAmount: 0,
    bankLoanAmount: 0,
    builderDemandPercent: 0,
    selfContributionPercent: 0,
    bankLoanPercent: 0
  }
  disbursements.value.push(newPhase)
  
  // Initialize calculations after adding
  setTimeout(() => {
    updatePhaseCalculations(disbursements.value.length - 1)
  }, 0)
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

const formatCurrency = (amount) => {
  if (!amount) return '₹0'
  return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const updatePhaseCalculations = (index) => {
  const phase = disbursements.value[index]
  if (!totalFlatAmount.value || !phase) return
  
  // Initialize values if undefined or null
  const builderDemand = parseFloat(phase.builderDemand) || 0
  const selfContribution = parseFloat(phase.selfContribution) || 0
  
  try {
    if (inputMode.value === 'percentage') {
      // Convert percentages to amounts
      phase.builderDemandAmount = (builderDemand / 100) * totalFlatAmount.value
      phase.selfContributionAmount = (selfContribution / 100) * totalFlatAmount.value
      phase.bankLoanAmount = Math.max(0, phase.builderDemandAmount - phase.selfContributionAmount)
      
      // Update percentage fields
      phase.builderDemandPercent = builderDemand
      phase.selfContributionPercent = selfContribution
      phase.bankLoanPercent = totalFlatAmount.value > 0 ? (phase.bankLoanAmount / totalFlatAmount.value) * 100 : 0
      phase.bankLoan = phase.bankLoanPercent
    } else {
      // Convert amounts to percentages
      phase.builderDemandAmount = builderDemand
      phase.selfContributionAmount = selfContribution
      phase.bankLoanAmount = Math.max(0, phase.builderDemandAmount - phase.selfContributionAmount)
      
      // Update percentage fields
      phase.builderDemandPercent = totalFlatAmount.value > 0 ? (phase.builderDemandAmount / totalFlatAmount.value) * 100 : 0
      phase.selfContributionPercent = totalFlatAmount.value > 0 ? (phase.selfContributionAmount / totalFlatAmount.value) * 100 : 0
      phase.bankLoanPercent = totalFlatAmount.value > 0 ? (phase.bankLoanAmount / totalFlatAmount.value) * 100 : 0
      phase.bankLoan = phase.bankLoanAmount
    }
    
    // Ensure all calculated values are numbers
    phase.builderDemandAmount = parseFloat(phase.builderDemandAmount) || 0
    phase.selfContributionAmount = parseFloat(phase.selfContributionAmount) || 0
    phase.bankLoanAmount = parseFloat(phase.bankLoanAmount) || 0
    phase.builderDemandPercent = parseFloat(phase.builderDemandPercent) || 0
    phase.selfContributionPercent = parseFloat(phase.selfContributionPercent) || 0
    phase.bankLoanPercent = parseFloat(phase.bankLoanPercent) || 0
    
  } catch (error) {
    console.error('Error in updatePhaseCalculations:', error)
    // Reset to safe defaults
    phase.builderDemandAmount = 0
    phase.selfContributionAmount = 0
    phase.bankLoanAmount = 0
    phase.builderDemandPercent = 0
    phase.selfContributionPercent = 0
    phase.bankLoanPercent = 0
    phase.bankLoan = 0
  }
}

const handlePhaseInput = (index) => {
  try {
    // Add a small delay to allow the input to be processed
    setTimeout(() => {
      updatePhaseCalculations(index)
    }, 10)
  } catch (error) {
    console.error('Error handling phase input:', error)
  }
}

const calculatePlan = () => {
  try {
    schedule.value = []
    phaseSummaries.value = []
    
    if (!disbursements.value.length || !totalFlatAmount.value) return
    
    // Update all phase calculations first and validate
    disbursements.value.forEach((_, index) => {
      try {
        updatePhaseCalculations(index)
      } catch (error) {
        console.error(`Error updating phase ${index + 1}:`, error)
      }
    })
    
    // Sort disbursements by month
    const sortedDisbursements = [...disbursements.value].sort((a, b) => (a.month || 1) - (b.month || 1))
  
  let totalInterest = 0
  let month = 1
  let currentBalance = 0
  let currentTotalEMI = 0
  const monthlyRate = interestRate.value / 12 / 100
  
  // Update all phase calculations first
  disbursements.value.forEach((_, index) => updatePhaseCalculations(index))
  
  // Calculate phase summaries - only for bank loan portions
  let cumulativeBankLoanDisbursed = 0
  let cumulativeTotalPaid = 0
  
  for (const phase of sortedDisbursements) {
    const bankLoanAmount = phase.bankLoanAmount || 0
    if (bankLoanAmount > 0) {
      cumulativeBankLoanDisbursed += bankLoanAmount
      const remainingTenure = loanTerm.value - (phase.month - 1)
      const phaseEMI = calculateEMI(bankLoanAmount, interestRate.value, remainingTenure)
      
      phaseSummaries.value.push({
        month: phase.month,
        builderDemandAmount: phase.builderDemandAmount,
        selfContributionAmount: phase.selfContributionAmount,
        bankLoanAmount: bankLoanAmount,
        emi: phaseEMI,
        remainingTenure
      })
    }
    cumulativeTotalPaid += (phase.builderDemandAmount || 0)
  }

  const maxPhaseMonth = Math.max(...sortedDisbursements.map(p => p.month))
  
  let currentLoanBalance = 0  // Only bank loan balance, not self contribution
  
  while (month <= loanTerm.value * 2 && (currentLoanBalance > 0.01 || month <= maxPhaseMonth)) {
    // Check for new disbursement this month
    const disbursementThisMonth = sortedDisbursements.find(d => d.month === month)
    if (disbursementThisMonth) {
      const bankLoanAmount = disbursementThisMonth.bankLoanAmount || 0
      if (bankLoanAmount > 0) {
        currentLoanBalance += bankLoanAmount
        
        // Calculate EMI for this new bank loan portion only
        const remainingTenure = loanTerm.value - (month - 1)
        const newPhaseEMI = calculateEMI(bankLoanAmount, interestRate.value, remainingTenure)
        currentTotalEMI += newPhaseEMI
      }
    }

    // Skip months before first disbursement or if no bank loan
    if (currentLoanBalance === 0) {
      month++
      continue
    }

    // Calculate interest on outstanding bank loan balance only (Indian bank style)
    const interest = currentLoanBalance * monthlyRate
    
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
    currentLoanBalance = Math.max(0, currentLoanBalance - totalPrincipalPayment)
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
      balance: Math.max(0, currentLoanBalance + prepayment)
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
        balance: currentLoanBalance
      })
    }
    
    month++
  }

  // Calculate interest savings
  const lastScheduleMonth = schedule.value.length > 0 ? 
    Math.max(...schedule.value.filter(s => s.type === 'EMI').map(s => s.month)) : 0
  const originalTotalInterest = cumulativeBankLoanDisbursed > 0 ? 
    (currentTotalEMI * loanTerm.value) - cumulativeBankLoanDisbursed : 0
  const interestSaved = Math.max(0, originalTotalInterest - totalInterest)
  
  summary.value = {
    baseEmi: currentTotalEMI,
    totalInterest,
    duration: lastScheduleMonth,
    monthsSaved: Math.max(0, loanTerm.value - lastScheduleMonth),
    interestSaved,
    totalDisbursed: cumulativeBankLoanDisbursed,
    totalPaid: cumulativeTotalPaid
  }

    drawCharts()
  } catch (error) {
    console.error('Error in calculatePlan:', error)
    // Reset to safe state
    schedule.value = []
    phaseSummaries.value = []
    summary.value = null
  }
}

const drawCharts = () => {
  try {
    const barCtx = document.getElementById('barChart')
    const lineCtx = document.getElementById('lineChart')
    
    if (!barCtx || !lineCtx) return
    
    if (barCtx.chart) barCtx.chart.destroy()
    if (lineCtx.chart) lineCtx.chart.destroy()

    // Filter only EMI entries for chart data
    const emiEntries = schedule.value.filter(x => x && x.type === 'EMI')
    const prepaymentEntries = schedule.value.filter(x => x && x.type === 'Prepayment')
    
    if (emiEntries.length === 0) return
    
    const months = emiEntries.map(x => `M${x.month || 0}`)
    const principalFromEmi = emiEntries.map(x => parseFloat(x.principalFromEmi) || 0)
    const interest = emiEntries.map(x => parseFloat(x.interest) || 0)
    const prepayments = emiEntries.map(x => {
      const prepaymentInSameMonth = prepaymentEntries.find(p => p.month === x.month)
      return prepaymentInSameMonth ? (parseFloat(prepaymentInSameMonth.prepayment) || 0) : 0
    })
    const balances = emiEntries.map(x => parseFloat(x.balance) || 0)

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
  } catch (error) {
    console.error('Error in drawCharts:', error)
  }
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
.phase-container {
  background-color: #f8fafc;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  border-left: 4px solid #3b82f6;
}
.phase-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.label-sm {
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  display: block;
}
.phase-info {
  background-color: #e0f2fe;
  padding: 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
}
.validation-summary {
  background-color: #fef3c7;
  padding: 1rem;
  border-radius: 0.5rem;
  border-left: 4px solid #f59e0b;
}
.validation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.5rem;
}
.readonly-input {
  background-color: #f3f4f6;
  cursor: not-allowed;
}
.text-green-600 {
  color: #059669;
}
.text-red-600 {
  color: #dc2626;
}
</style>