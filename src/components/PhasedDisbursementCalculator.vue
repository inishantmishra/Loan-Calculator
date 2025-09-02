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
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
          <div>
            <label class="label-sm">Month</label>
            <input v-model.number="phase.month" class="input" type="number" placeholder="Month" />
          </div>
          <div class="flex flex-col">
            <label class="label-sm">Builder Demand ({{ phase.builderInputMode === 'percentage' ? '%' : '₹' }})</label>
            <div class="flex gap-1">
              <input 
                :value="phase.builderDemand" 
                @input="(e) => { phase.builderDemand = parseFloat(e.target.value) || 0; handlePhaseInput(index) }"
                class="input input-wide" 
                type="number" 
                :placeholder="phase.builderInputMode === 'percentage' ? 'Builder %' : 'Amount'" 
              />
              <select v-model="phase.builderInputMode" class="input input-dropdown" @change="handlePhaseInput(index)">
                <option value="percentage">%</option>
                <option value="amount">₹</option>
              </select>
            </div>
          </div>
          <div class="flex flex-col">
            <label class="label-sm">Self Contribution ({{ phase.selfInputMode === 'percentage' ? '%' : '₹' }})</label>
            <div class="flex gap-1">
              <input 
                :value="phase.selfContribution" 
                @input="(e) => { if (index !== 0) { phase.selfContribution = parseFloat(e.target.value) || 0; handlePhaseInput(index) } }"
                class="input input-wide" 
                type="number" 
                :placeholder="phase.selfInputMode === 'percentage' ? 'Self %' : 'Amount'" 
                :readonly="index === 0"
                :class="{ 'readonly-input': index === 0 }"
              />
              <select v-model="phase.selfInputMode" class="input input-dropdown" @change="handlePhaseInput(index)">
                <option value="percentage">%</option>
                <option value="amount">₹</option>
              </select>
            </div>
          </div>
          <div class="flex flex-col">
            <label class="label-sm">Bank Loan ({{ phase.bankInputMode === 'percentage' ? '%' : '₹' }})</label>
            <div class="flex gap-1">
              <input 
                :value="phase.bankLoan" 
                class="input input-wide readonly-input" 
                type="number" 
                :placeholder="phase.bankInputMode === 'percentage' ? 'Bank %' : 'Amount'" 
                readonly
              />
              <select v-model="phase.bankInputMode" class="input input-dropdown readonly-input" disabled>
                <option value="percentage">%</option>
                <option value="amount">₹</option>
              </select>
            </div>
          </div>
        </div>
        <div class="phase-info mt-2" v-if="totalFlatAmount > 0">
          <div class="info-grid">
            <span><strong>Builder:</strong> {{ formatCurrency(phase.builderDemandAmount || 0) }} ({{ (phase.builderDemandPercent || 0).toFixed(1) }}%)</span>
            <span><strong>Self:</strong> {{ formatCurrency(phase.selfContributionAmount || 0) }} ({{ (phase.selfContributionPercent || 0).toFixed(1) }}%)</span>
            <span><strong>Bank:</strong> {{ formatCurrency(phase.bankLoanAmount || 0) }} ({{ (phase.bankLoanPercent || 0).toFixed(1) }}%)</span>
          </div>
          <div class="cumulative-info mt-2 pt-2 border-t border-gray-300">
            <div class="text-sm font-medium text-gray-700 mb-1">Cumulative up to this phase:</div>
            <div class="cumulative-grid">
              <span class="text-blue-600"><strong>Total Self:</strong> {{ getCumulativeSelfPercent(index).toFixed(1) }}% ({{ formatCurrency(getCumulativeSelfAmount(index)) }})</span>
              <span class="text-green-600"><strong>Total Bank:</strong> {{ getCumulativeBankPercent(index).toFixed(1) }}% ({{ formatCurrency(getCumulativeBankAmount(index)) }})</span>
            </div>
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
    
    <!-- Consolidated summary will appear below -->

    <div v-if="summary" class="summary-box">
      <div class="summary-item">
        <p><strong>Loan Details</strong></p>
        <p>Total Loan Amount: {{ formatCurrency(summary.totalDisbursed || 0) }}</p>
        <p>Final Combined EMI: {{ formatCurrency(summary.baseEmi || 0) }}</p>
        <p>Original Term: {{ Math.floor(loanTerm / 12) }} years {{ loanTerm % 12 }} months</p>
        <p>Actual Duration: {{ Math.floor((summary.duration || 0) / 12) }} years {{ (summary.duration || 0) % 12 }} months</p>
        <p>Months Saved: {{ summary.monthsSaved || 0 }} months</p>
      </div>
      <div class="summary-item">
        <p><strong>Financial Summary</strong></p>
        <p>Total Interest Paid: {{ formatCurrency(summary.totalInterest || 0) }}</p>
        <p v-if="summary.interestSaved > 0">Interest Saved: {{ formatCurrency(summary.interestSaved) }}</p>
        <p>Approved Loan: {{ formatCurrency(approvedLoanAmount) }}</p>
        <p :class="{ 'text-red-600 font-bold': totalBankLoanUsed > approvedLoanAmount }">
          Loan Used: {{ formatCurrency(totalBankLoanUsed) }}
          <span v-if="totalBankLoanUsed > approvedLoanAmount" class="text-red-600"> ⚠️ EXCEEDS LIMIT!</span>
        </p>
        <p :class="{ 'text-red-600': totalBankLoanUsed > approvedLoanAmount }">
          Loan Remaining: {{ formatCurrency(approvedLoanAmount - totalBankLoanUsed) }}
        </p>
      </div>
      <div class="summary-item">
        <p><strong>Property Progress</strong></p>
        <p>Total Flat Cost: {{ formatCurrency(totalFlatAmount) }}</p>
        <p>Amount Paid: {{ formatCurrency(summary.totalPaid || 0) }}</p>
        <p>Amount Remaining: {{ formatCurrency(totalFlatAmount - (summary.totalPaid || 0)) }}</p>
      </div>
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
import { ref, computed, onMounted, nextTick } from 'vue'
import Chart from 'chart.js/auto'

const totalFlatAmount = ref(24150000)
const approvedLoanAmount = ref(18112500)
const loanTerm = ref(240)
const interestRate = ref(7.1)
const comfortableEmi = ref(100000)
const monthlyExtra = ref(0)
const emiIncreaseRate = ref(0)
const inputMode = ref('percentage')

const disbursements = ref([
  { 
    month: 0, 
    builderDemand: 0, 
    selfContribution: 500000, 
    bankLoan: 0,
    builderDemandAmount: 0,
    selfContributionAmount: 500000,
    bankLoanAmount: 0,
    builderDemandPercent: 0,
    selfContributionPercent: 2.1,
    bankLoanPercent: 0,
    builderInputMode: 'amount',
    selfInputMode: 'amount',
    bankInputMode: 'amount'
  },
  { 
    month: 1, 
    builderDemand: 10, 
    selfContribution: 0, 
    bankLoan: 10,
    builderDemandAmount: 2415000,
    selfContributionAmount: 0,
    bankLoanAmount: 2415000,
    builderDemandPercent: 10,
    selfContributionPercent: 0,
    bankLoanPercent: 10,
    builderInputMode: 'percentage',
    selfInputMode: 'percentage',
    bankInputMode: 'percentage'
  },
  { 
    month: 2, 
    builderDemand: 15, 
    selfContribution: 0, 
    bankLoan: 15,
    builderDemandAmount: 3622500,
    selfContributionAmount: 0,
    bankLoanAmount: 3622500,
    builderDemandPercent: 15,
    selfContributionPercent: 0,
    bankLoanPercent: 15,
    builderInputMode: 'percentage',
    selfInputMode: 'percentage',
    bankInputMode: 'percentage'
  },
  { 
    month: 3, 
    builderDemand: 15, 
    selfContribution: 0, 
    bankLoan: 15,
    builderDemandAmount: 3622500,
    selfContributionAmount: 0,
    bankLoanAmount: 3622500,
    builderDemandPercent: 15,
    selfContributionPercent: 0,
    bankLoanPercent: 15,
    builderInputMode: 'percentage',
    selfInputMode: 'percentage',
    bankInputMode: 'percentage'
  },
  { 
    month: 4, 
    builderDemand: 12.5, 
    selfContribution: 0, 
    bankLoan: 12.5,
    builderDemandAmount: 3018750,
    selfContributionAmount: 0,
    bankLoanAmount: 3018750,
    builderDemandPercent: 12.5,
    selfContributionPercent: 0,
    bankLoanPercent: 12.5,
    builderInputMode: 'percentage',
    selfInputMode: 'percentage',
    bankInputMode: 'percentage'
  },
  { 
    month: 5, 
    builderDemand: 12.5, 
    selfContribution: 0, 
    bankLoan: 12.5,
    builderDemandAmount: 3018750,
    selfContributionAmount: 0,
    bankLoanAmount: 3018750,
    builderDemandPercent: 12.5,
    selfContributionPercent: 0,
    bankLoanPercent: 12.5,
    builderInputMode: 'percentage',
    selfInputMode: 'percentage',
    bankInputMode: 'percentage'
  },
  { 
    month: 6, 
    builderDemand: 10, 
    selfContribution: 0, 
    bankLoan: 10,
    builderDemandAmount: 2415000,
    selfContributionAmount: 0,
    bankLoanAmount: 2415000,
    builderDemandPercent: 10,
    selfContributionPercent: 0,
    bankLoanPercent: 10,
    builderInputMode: 'percentage',
    selfInputMode: 'percentage',
    bankInputMode: 'percentage'
  },
  { 
    month: 7, 
    builderDemand: 10, 
    selfContribution: 0, 
    bankLoan: 10,
    builderDemandAmount: 2415000,
    selfContributionAmount: 0,
    bankLoanAmount: 2415000,
    builderDemandPercent: 10,
    selfContributionPercent: 0,
    bankLoanPercent: 10,
    builderInputMode: 'percentage',
    selfInputMode: 'percentage',
    bankInputMode: 'percentage'
  },
  { 
    month: 8, 
    builderDemand: 10, 
    selfContribution: 0, 
    bankLoan: 10,
    builderDemandAmount: 2415000,
    selfContributionAmount: 0,
    bankLoanAmount: 2415000,
    builderDemandPercent: 10,
    selfContributionPercent: 0,
    bankLoanPercent: 10,
    builderInputMode: 'percentage',
    selfInputMode: 'percentage',
    bankInputMode: 'percentage'
  },
  { 
    month: 9, 
    builderDemand: 5, 
    selfContribution: 0, 
    bankLoan: 5,
    builderDemandAmount: 1207500,
    selfContributionAmount: 0,
    bankLoanAmount: 1207500,
    builderDemandPercent: 5,
    selfContributionPercent: 0,
    bankLoanPercent: 5,
    builderInputMode: 'percentage',
    selfInputMode: 'percentage',
    bankInputMode: 'percentage'
  }
])

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

const getCumulativeSelfAmount = (upToIndex) => {
  return disbursements.value.slice(0, upToIndex + 1).reduce((sum, phase) => {
    return sum + (phase.selfContributionAmount || 0)
  }, 0)
}

const getCumulativeBankAmount = (upToIndex) => {
  return disbursements.value.slice(0, upToIndex + 1).reduce((sum, phase) => {
    return sum + (phase.bankLoanAmount || 0)
  }, 0)
}

const getCumulativeSelfPercent = (upToIndex) => {
  const amount = getCumulativeSelfAmount(upToIndex)
  return totalFlatAmount.value > 0 ? (amount / totalFlatAmount.value) * 100 : 0
}

const getCumulativeBankPercent = (upToIndex) => {
  const amount = getCumulativeBankAmount(upToIndex)
  return totalFlatAmount.value > 0 ? (amount / totalFlatAmount.value) * 100 : 0
}

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
    bankLoanPercent: 0,
    builderInputMode: 'percentage',
    selfInputMode: 'percentage',
    bankInputMode: 'percentage'
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
  
  // Special handling for Phase 0 (Application money) - fixed amount
  if (index === 0) {
    phase.builderDemandAmount = 0
    phase.selfContributionAmount = 500000 // Fixed 5L amount
    phase.bankLoanAmount = 0
    phase.builderDemandPercent = 0
    phase.selfContributionPercent = totalFlatAmount.value > 0 ? (500000 / totalFlatAmount.value) * 100 : 0
    phase.bankLoanPercent = 0
    // Ensure the input fields show the correct values
    phase.builderDemand = 0
    phase.selfContribution = 500000 // This should show 500000 in the input
    phase.bankLoan = 0
    return
  }
  
  // For other phases, only skip if BOTH values are truly empty (not zero)
  // This prevents overwriting the initial percentage values
  if ((phase.builderDemand === '' || phase.builderDemand === null || phase.builderDemand === undefined) && 
      (phase.selfContribution === '' || phase.selfContribution === null || phase.selfContribution === undefined)) {
    // But still calculate amounts for display purposes if we have valid input mode and flat amount
    if (phase.builderInputMode && phase.selfInputMode) {
      // Calculate amounts for display even if inputs are empty
      phase.builderDemandAmount = 0
      phase.selfContributionAmount = 0
      phase.bankLoanAmount = 0
      phase.builderDemandPercent = 0
      phase.selfContributionPercent = 0
      phase.bankLoanPercent = 0
      phase.bankLoan = 0
    }
    return
  }
  
  // Initialize values if undefined or null
  const builderDemand = parseFloat(phase.builderDemand) || 0
  const selfContribution = parseFloat(phase.selfContribution) || 0
  
  try {
    // Handle builder demand based on its input mode
    if (phase.builderInputMode === 'percentage') {
      phase.builderDemandAmount = (builderDemand / 100) * totalFlatAmount.value
      phase.builderDemandPercent = builderDemand
    } else {
      phase.builderDemandAmount = builderDemand
      phase.builderDemandPercent = totalFlatAmount.value > 0 ? (builderDemand / totalFlatAmount.value) * 100 : 0
    }
    
    // Handle self contribution based on its input mode
    if (phase.selfInputMode === 'percentage') {
      phase.selfContributionAmount = (selfContribution / 100) * totalFlatAmount.value
      phase.selfContributionPercent = selfContribution
    } else {
      phase.selfContributionAmount = selfContribution
      phase.selfContributionPercent = totalFlatAmount.value > 0 ? (selfContribution / totalFlatAmount.value) * 100 : 0
    }
    
    // Bank loan is always the difference (builder demand - self contribution)
    phase.bankLoanAmount = Math.max(0, phase.builderDemandAmount - phase.selfContributionAmount)
    phase.bankLoanPercent = totalFlatAmount.value > 0 ? (phase.bankLoanAmount / totalFlatAmount.value) * 100 : 0
    
    // Update bank loan display value based on its input mode
    if (phase.bankInputMode === 'percentage') {
      phase.bankLoan = parseFloat(phase.bankLoanPercent.toFixed(1))
    } else {
      phase.bankLoan = phase.bankLoanAmount
    }
    
    // Ensure all calculated values are numbers
    phase.builderDemandAmount = parseFloat(phase.builderDemandAmount) || 0
    phase.selfContributionAmount = parseFloat(phase.selfContributionAmount) || 0
    phase.bankLoanAmount = parseFloat(phase.bankLoanAmount) || 0
    phase.builderDemandPercent = parseFloat(phase.builderDemandPercent) || 0
    phase.selfContributionPercent = parseFloat(phase.selfContributionPercent) || 0
    phase.bankLoanPercent = parseFloat(phase.bankLoanPercent) || 0
    
    // Validation: Check if bank loan exceeds approved limit
    const currentTotal = totalBankLoanUsed.value - phase.bankLoanAmount + phase.bankLoanAmount
    if (currentTotal > approvedLoanAmount.value) {
      console.warn(`Bank loan amount exceeds approved limit. Total: ${currentTotal}, Approved: ${approvedLoanAmount.value}`)
    }
    
    // Validation: Check if phase month is within loan term
    if (phase.month > loanTerm.value || phase.month < 0) {
      console.warn(`Phase month ${phase.month} is outside valid range (0-${loanTerm.value})`)
    }
    
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
    
    if (!disbursements.value.length || !totalFlatAmount.value || totalFlatAmount.value <= 0) {
      console.log('calculatePlan early exit:', { disbursements: disbursements.value.length, totalFlat: totalFlatAmount.value })
      return
    }
    
    // Validation 1: Check for duplicate months
    const months = disbursements.value.map(d => d.month).filter(m => m > 0)
    const uniqueMonths = [...new Set(months)]
    if (months.length !== uniqueMonths.length) {
      console.error('Duplicate phase months detected:', months)
      alert('Error: Multiple phases cannot be in the same month. Please use different months for each phase.')
      return
    }
    
    // Validation 2: Check total bank loan doesn't exceed approved amount
    if (totalBankLoanUsed.value > approvedLoanAmount.value) {
      console.error('Total bank loan exceeds approved amount:', { used: totalBankLoanUsed.value, approved: approvedLoanAmount.value })
      alert(`Error: Total bank loan (₹${totalBankLoanUsed.value.toLocaleString()}) exceeds approved amount (₹${approvedLoanAmount.value.toLocaleString()})`)
      return
    }
    
    // Validation 3: Check all phase months are within loan term
    const invalidMonths = disbursements.value.filter(d => d.month > loanTerm.value || d.month < 1)
    if (invalidMonths.length > 0) {
      console.error('Invalid phase months:', invalidMonths.map(d => d.month))
      alert(`Error: Phase months must be between 1 and ${loanTerm.value}`)
      return
    }
    
    // Validation 4: Check for valid interest rate and loan term
    if (interestRate.value <= 0 || interestRate.value > 50) {
      console.error('Invalid interest rate:', interestRate.value)
      alert('Error: Interest rate must be between 0.1% and 50%')
      return
    }
    
    if (loanTerm.value <= 0 || loanTerm.value > 600) {
      console.error('Invalid loan term:', loanTerm.value)
      alert('Error: Loan term must be between 1 and 600 months')
      return
    }
    
    // Validation 5: Check for phases with zero bank loan
    const phasesWithoutLoan = disbursements.value.filter(d => (d.bankLoanAmount || 0) <= 0)
    if (phasesWithoutLoan.length === disbursements.value.length) {
      console.warn('No phases have bank loan amounts')
      alert('Warning: No phases require bank loans. Please check your phase configurations.')
    }
    
    // Update all phase calculations first
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
    let currentLoanBalance = 0  // Only bank loan balance, not self contribution
    let currentTotalEMI = 0
    const monthlyRate = interestRate.value / 12 / 100
    
    // Calculate phase summaries - only for bank loan portions
    let cumulativeBankLoanDisbursed = 0
    let cumulativeTotalPaid = 0
    
    for (const phase of sortedDisbursements) {
      const bankLoanAmount = phase.bankLoanAmount || 0
      console.log(`Phase ${phase.month}:`, {
        builderDemand: phase.builderDemandAmount,
        selfContribution: phase.selfContributionAmount,
        bankLoan: bankLoanAmount
      })
      
      if (bankLoanAmount > 0) {
        cumulativeBankLoanDisbursed += bankLoanAmount
        const remainingTenure = Math.max(1, loanTerm.value - (phase.month - 1))
        const phaseEMI = calculateEMI(bankLoanAmount, interestRate.value, remainingTenure)
        
        console.log(`Phase ${phase.month} EMI calculation:`, {
          bankLoanAmount,
          remainingTenure,
          interestRate: interestRate.value,
          calculatedEMI: phaseEMI
        })
        
        phaseSummaries.value.push({
          month: phase.month,
          builderDemandAmount: phase.builderDemandAmount,
          selfContributionAmount: phase.selfContributionAmount,
          bankLoanAmount: bankLoanAmount,
          emi: phaseEMI,
          remainingTenure
        })
      }
      cumulativeTotalPaid += (phase.builderDemandAmount || 0) + (phase.selfContributionAmount || 0)
    }

    const maxPhaseMonth = Math.max(...sortedDisbursements.map(p => p.month || 1), 1)
    
    console.log('Starting calculation:', { 
      phases: sortedDisbursements.length, 
      maxPhaseMonth, 
      cumulativeBankLoan: cumulativeBankLoanDisbursed,
      totalFlatAmount: totalFlatAmount.value 
    })
    
    while (month <= loanTerm.value * 2 && (currentLoanBalance > 0.01 || month <= maxPhaseMonth)) {
    // Check for new disbursement this month
    const disbursementThisMonth = sortedDisbursements.find(d => d.month === month)
    if (disbursementThisMonth) {
      const bankLoanAmount = disbursementThisMonth.bankLoanAmount || 0
      if (bankLoanAmount > 0) {
        currentLoanBalance += bankLoanAmount
        
        // Add the new phase EMI to the current total EMI (this is more realistic)
        const remainingTenure = Math.max(1, loanTerm.value - (month - 1))
        const newPhaseEMI = calculateEMI(bankLoanAmount, interestRate.value, remainingTenure)
        currentTotalEMI += newPhaseEMI
        
        console.log(`Month ${month} - New disbursement:`, {
          bankLoanAmount,
          currentLoanBalance,
          remainingTenure,
          newPhaseEMI,
          currentTotalEMI
        })
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
    if (totalPaymentFromAllSources >= currentLoanBalance + interest) {
      const finalPayment = currentLoanBalance + interest
      const finalPrincipal = currentLoanBalance
      const actualEMIPrincipal = Math.min(scheduledEmiPrincipal, finalPrincipal)
      const actualEMIPayment = Math.min(adjustedBaseEMI, interest + actualEMIPrincipal)
      const remainingPrincipal = Math.max(0, finalPrincipal - actualEMIPrincipal)
      
      // Scheduled EMI entry
      schedule.value.push({
        month,
        type: 'EMI',
        scheduledEmi: adjustedBaseEMI,
        interest,
        principalFromEmi: actualEMIPrincipal,
        prepayment: 0,
        totalPayment: actualEMIPayment,
        balance: remainingPrincipal
      })
      
      // Prepayment entry if any remaining principal
      if (remainingPrincipal > 0) {
        schedule.value.push({
          month,
          type: 'Prepayment',
          scheduledEmi: 0,
          interest: 0,
          principalFromEmi: 0,
          prepayment: remainingPrincipal,
          totalPayment: remainingPrincipal,
          balance: 0
        })
      }
      
      totalInterest += interest
      break
    }
    
    // Normal case
    // First, apply scheduled EMI principal
    const balanceAfterEMI = Math.max(0, currentLoanBalance - scheduledEmiPrincipal)
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
      balance: balanceAfterEMI
    })
    
    // Then apply prepayment if any
    if (prepayment > 0) {
      const balanceAfterPrepayment = Math.max(0, balanceAfterEMI - prepayment)
      schedule.value.push({
        month,
        type: 'Prepayment',
        scheduledEmi: 0,
        interest: 0,
        principalFromEmi: 0,
        prepayment: prepayment,
        totalPayment: prepayment,
        balance: balanceAfterPrepayment
      })
      currentLoanBalance = balanceAfterPrepayment
    } else {
      currentLoanBalance = balanceAfterEMI
    }
    
    month++
  }

  // Calculate interest savings and final EMI properly
  const emiEntries = schedule.value.filter(s => s.type === 'EMI')
  const prepaymentEntries = schedule.value.filter(s => s.type === 'Prepayment')
  const lastScheduleMonth = emiEntries.length > 0 ? 
    Math.max(...emiEntries.map(s => s.month)) : 0
    
  // Calculate interest saved ONLY if there are actual prepayments
  let interestSaved = 0
  let originalTotalInterest = 0
  
  if (prepaymentEntries.length > 0 || comfortableEmi.value > 0 || monthlyExtra.value > 0) {
    // Calculate what interest would have been without any prepayments
    // This means calculating EMI for each phase without extra payments
    
    // Simulate loan without prepayments
    for (const phase of sortedDisbursements) {
      if (phase.bankLoanAmount > 0) {
        const remainingTenure = Math.max(1, loanTerm.value - (phase.month - 1))
        const phaseEMI = calculateEMI(phase.bankLoanAmount, interestRate.value, remainingTenure)
        originalTotalInterest += (phaseEMI * remainingTenure) - phase.bankLoanAmount
      }
    }
    
    interestSaved = Math.max(0, originalTotalInterest - totalInterest)
  }
  
  // Find the final combined EMI from the last EMI entry
  const finalCombinedEMI = emiEntries.length > 0 ? 
    emiEntries[emiEntries.length - 1].scheduledEmi : 0
  
  console.log('Final Summary Calculation:', {
    lastScheduleMonth,
    originalTotalInterest,
    totalInterestPaid: totalInterest,
    interestSaved,
    finalCombinedEMI,
    cumulativeBankLoanDisbursed,
    scheduleEntries: schedule.value.length
  })
  
  summary.value = {
    baseEmi: finalCombinedEMI,
    totalInterest,
    duration: lastScheduleMonth,
    monthsSaved: Math.max(0, loanTerm.value - lastScheduleMonth),
    interestSaved,
    totalDisbursed: cumulativeBankLoanDisbursed,
    totalPaid: cumulativeTotalPaid
  }

  console.log('Schedule array length:', schedule.value.length)
  if (schedule.value.length > 0) {
    console.log('First few schedule entries:', schedule.value.slice(0, 3))
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

let barChart = null
let lineChart = null

const drawCharts = () => {
  try {
    const barCtx = document.getElementById('barChart')
    const lineCtx = document.getElementById('lineChart')
    
    if (!barCtx || !lineCtx) {
      console.log('Chart canvases not found')
      return
    }
    
    // Destroy existing charts
    if (barChart) {
      barChart.destroy()
      barChart = null
    }
    if (lineChart) {
      lineChart.destroy()
      lineChart = null
    }

    // Filter only EMI entries for chart data
    const emiEntries = schedule.value.filter(x => x && x.type === 'EMI')
    const prepaymentEntries = schedule.value.filter(x => x && x.type === 'Prepayment')
    
    if (emiEntries.length === 0) {
      console.log('No EMI entries for charts')
      return
    }
    
    const months = emiEntries.map(x => `M${x.month || 0}`)
    const principalFromEmi = emiEntries.map(x => parseFloat(x.principalFromEmi) || 0)
    const interest = emiEntries.map(x => parseFloat(x.interest) || 0)
    const prepayments = emiEntries.map(x => {
      const prepaymentInSameMonth = prepaymentEntries.find(p => p.month === x.month)
      return prepaymentInSameMonth ? (parseFloat(prepaymentInSameMonth.prepayment) || 0) : 0
    })
    const balances = emiEntries.map(x => parseFloat(x.balance) || 0)
    
    console.log('Chart data:', { months: months.length, principal: principalFromEmi.length, interest: interest.length })

    barChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: 'Principal from EMI', data: principalFromEmi, backgroundColor: '#60a5fa' },
          { label: 'Interest', data: interest, backgroundColor: '#fcd34d' },
          { label: 'Prepayment', data: prepayments, backgroundColor: '#86efac' }
        ]
      },
      options: { 
        responsive: true, 
        plugins: { 
          legend: { position: 'top' } 
        },
        scales: {
          x: { title: { display: true, text: 'Months' } },
          y: { title: { display: true, text: 'Amount (₹)' } }
        }
      }
    })

    lineChart = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{ 
          label: 'Outstanding Balance', 
          data: balances, 
          borderColor: '#7c3aed', 
          borderWidth: 2, 
          fill: false 
        }]
      },
      options: { 
        responsive: true, 
        plugins: { 
          legend: { position: 'top' } 
        },
        scales: {
          x: { title: { display: true, text: 'Months' } },
          y: { title: { display: true, text: 'Balance (₹)' } }
        }
      }
    })
    
    console.log('Charts created successfully')
  } catch (error) {
    console.error('Error in drawCharts:', error)
  }
}

const downloadCSV = () => {
  if (!schedule.value || schedule.value.length === 0) {
    alert('No schedule data to download. Please calculate the plan first.')
    return
  }
  
  let csv = 'Month,Type,Scheduled EMI,Interest,Principal from EMI,Prepayment,Total Payment,Outstanding Balance\n'
  schedule.value.forEach(r => {
    if (r && typeof r === 'object') {
      csv += `${r.month || 0},${r.type || 'Unknown'},${r.scheduledEmi?.toFixed(2) || '0'},${r.interest?.toFixed(2) || '0'},${r.principalFromEmi?.toFixed(2) || '0'},${r.prepayment?.toFixed(2) || '0'},${r.totalPayment?.toFixed(2) || '0'},${r.balance?.toFixed(2) || '0'}\n`
    }
  })

  try {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'phased_loan_schedule.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading CSV:', error)
    alert('Error creating CSV file. Please try again.')
  }
}

// Initialize all phase calculations on component mount
onMounted(async () => {
  console.log('Component mounted, disbursements:', disbursements.value)
  
  // Wait for DOM to be ready
  await nextTick()
  
  console.log('About to force re-assignment of all phase data')
  
  // Create completely new objects to force Vue reactivity
  const newDisbursements = disbursements.value.map((phase, index) => {
    if (index === 0) {
      // Phase 0 - Application money
      return {
        month: 0,
        builderDemand: 0,
        selfContribution: 500000,
        bankLoan: 0,
        builderDemandAmount: 0,
        selfContributionAmount: 500000,
        bankLoanAmount: 0,
        builderDemandPercent: 0,
        selfContributionPercent: 2.07,
        bankLoanPercent: 0,
        builderInputMode: 'amount',
        selfInputMode: 'amount',
        bankInputMode: 'amount'
      }
    } else {
      // Other phases - explicitly set the correct values
      const newPhase = {
        ...phase,
        // Ensure the display values are explicitly set
        builderDemand: phase.builderDemand,
        selfContribution: phase.selfContribution,
        bankLoan: phase.bankLoan || 0
      }
      console.log(`Creating new phase ${index}:`, {
        month: newPhase.month,
        builderDemand: newPhase.builderDemand,
        selfContribution: newPhase.selfContribution,
        builderInputMode: newPhase.builderInputMode,
        selfInputMode: newPhase.selfInputMode
      })
      return newPhase
    }
  })
  
  // Replace the entire array
  disbursements.value = newDisbursements
  
  console.log('After re-assignment, disbursements:', disbursements.value)
  
  // Force calculations
  await nextTick()
  disbursements.value.forEach((_, index) => {
    updatePhaseCalculations(index)
  })
})
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
.text-blue-600 {
  color: #2563eb;
}
.cumulative-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  font-size: 0.875rem;
}
.border-t {
  border-top-width: 1px;
}
.border-gray-300 {
  border-color: #d1d5db;
}
.input-wide {
  width: 120px;
  flex: 1;
  min-width: 100px;
}
.input-dropdown {
  width: 45px;
  min-width: 40px;
  font-size: 0.75rem;
  padding: 0.375rem 0.25rem;
  text-align: center;
}
</style>