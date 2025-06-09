
<template>
  <div class="p-4 space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label>Total Loan Amount</label>
        <input v-model.number="loanAmount" type="number" class="input" />
      </div>
      <div>
        <label>Interest Rate (%)</label>
        <input v-model.number="interestRate" type="number" class="input" />
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
      <p>Monthly EMI: ₹{{ summary.emi.toFixed(2) }}</p>
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
import { ref } from 'vue';
import { calculateFullSchedule, downloadCSVFile, renderCharts } from '../utils/fullLogic';

const loanAmount = ref(0);
const interestRate = ref(0);
const loanTerm = ref(0);
const comfortableEmi = ref(0);
const monthlyExtra = ref(0);
const emiIncreaseRate = ref(0);
const lumpSums = ref([]);
const summary = ref(null);

function addLumpSum() {
  lumpSums.value.push({ month: 1, amount: 0, recurring: false, repeat: 3 });
}

function calculatePlan() {
  const result = calculateFullSchedule({
    loanAmount: loanAmount.value,
    interestRate: interestRate.value,
    loanTerm: loanTerm.value,
    comfortableEmi: comfortableEmi.value,
    monthlyExtra: monthlyExtra.value,
    emiIncreaseRate: emiIncreaseRate.value,
    lumpSums: lumpSums.value,
  });

  summary.value = result.summary;
  renderCharts(result.schedule, 'barChartFull', 'lineChartFull');
}

function downloadCSV() {
  if (!summary.value) return;
  downloadCSVFile(summary.value.schedule, 'full_schedule.csv');
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