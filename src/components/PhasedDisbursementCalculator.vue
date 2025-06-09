<template>
  <div>
    <h2 class="text-xl font-semibold mb-4">Phased Disbursement Calculator</h2>
    <div class="grid gap-2 md:grid-cols-2">
      <input v-model.number="approvedAmount" type="number" placeholder="Approved Loan Amount" class="input" />
      <input v-model.number="interestRate" type="number" placeholder="Interest Rate (%)" class="input" />
      <input v-model.number="loanTerm" type="number" placeholder="Loan Term (months)" class="input" />
      <input v-model.number="comfortableEmi" type="number" placeholder="Comfortable EMI" class="input" />
      <input v-model.number="monthlyExtra" type="number" placeholder="Monthly Extra Payment" class="input" />
      <input v-model.number="emiIncreaseRate" type="number" placeholder="Annual EMI Increase (%)" class="input" />
    </div>

    <div class="mt-4">
      <h3 class="font-bold">Disbursement Phases</h3>
      <div v-for="(d, index) in disbursements" :key="index" class="flex gap-2 items-center mb-1">
        <input v-model.number="d.month" type="number" placeholder="Month" class="input" />
        <input v-model.number="d.percent" type="number" placeholder="% of Loan" class="input" />
      </div>
      <button @click="addDisbursement" class="btn">+ Add Disbursement</button>
    </div>

    <div class="mt-4">
      <h3 class="font-bold">Lump Sum Payments</h3>
      <div v-for="(l, index) in lumpSums" :key="index" class="flex gap-2 items-center mb-1">
        <input v-model.number="l.month" type="number" placeholder="Month" class="input" />
        <input v-model.number="l.amount" type="number" placeholder="Amount" class="input" />
        <label><input type="checkbox" v-model="l.recurring" /> Recurring</label>
        <input v-if="l.recurring" v-model.number="l.repeat" type="number" placeholder="Repeat every X months" class="input" />
      </div>
      <button @click="addLumpSum" class="btn">+ Add Lump Sum</button>
    </div>

    <div class="mt-4">
      <button @click="calculatePlan" class="btn">Calculate Plan</button>
      <button @click="downloadCSV" class="btn ml-2">Download CSV</button>
    </div>

    <div v-if="summary" class="mt-6">
      <div id="barChartPhase" class="h-64"></div>
      <div id="lineChartPhase" class="h-64 mt-4"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { calculatePhasedSchedule, downloadCSVFile, renderCharts } from '../utils/phasedLogic';

const approvedAmount = ref(0);
const interestRate = ref(0);
const loanTerm = ref(0);
const comfortableEmi = ref(0);
const monthlyExtra = ref(0);
const emiIncreaseRate = ref(0);

const disbursements = ref([{ month: 1, percent: 100 }]);
const lumpSums = ref([]);
const summary = ref(null);

function addDisbursement() {
  disbursements.value.push({ month: 1, percent: 0 });
}

function addLumpSum() {
  lumpSums.value.push({ month: 1, amount: 0, recurring: false, repeat: 3 });
}

function calculatePlan() {
  const result = calculatePhasedSchedule({
    approvedAmount: approvedAmount.value,
    interestRate: interestRate.value,
    loanTerm: loanTerm.value,
    comfortableEmi: comfortableEmi.value,
    monthlyExtra: monthlyExtra.value,
    emiIncreaseRate: emiIncreaseRate.value,
    disbursements: disbursements.value,
    lumpSums: lumpSums.value,
  });

  summary.value = result.summary;
  renderCharts(result.schedule, 'barChartPhase', 'lineChartPhase');
}

function downloadCSV() {
  if (!summary.value) return;
  downloadCSVFile(summary.value.schedule, 'phased_schedule.csv');
}
</script>

<style scoped>
.input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 0.375rem;
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