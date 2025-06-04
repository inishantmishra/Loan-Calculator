<template>
  <div class="max-w-6xl mx-auto p-6 space-y-8">
    <h1 class="text-3xl font-bold text-center">Loan Prepayment Planner</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block font-semibold">Loan Type</label>
        <select v-model="loanType" class="w-full p-2 border rounded">
          <option value="full">Full Disbursement</option>
          <option value="phased">Phased Disbursement</option>
        </select>
      </div>

      <div>
        <label class="block font-semibold">Approved Loan Amount</label>
        <input v-model.number="approvedAmount" type="number" class="w-full p-2 border rounded" />
      </div>

      <div v-if="loanType === 'full'">
        <label class="block font-semibold">Loan Term (months)</label>
        <input v-model.number="loanTerm" type="number" class="w-full p-2 border rounded" />
      </div>

      <div>
        <label class="block font-semibold">Interest Rate (% per annum)</label>
        <input v-model.number="interestRate" type="number" step="0.01" class="w-full p-2 border rounded" />
      </div>

      <div>
        <label class="block font-semibold">Recurring Extra Payment (optional)</label>
        <input v-model.number="recurringExtraPayment" type="number" class="w-full p-2 border rounded" />
      </div>
    </div>

    <div v-if="loanType === 'phased'">
      <h2 class="font-bold text-xl mt-4">Disbursement Phases</h2>
      <div v-for="(phase, index) in disbursementPhases" :key="index" class="flex gap-2 mb-2">
        <input v-model.number="phase.month" placeholder="Disburse at month" type="number" class="p-2 border rounded w-1/3" />
        <input v-model.number="phase.percent" placeholder="% of loan" type="number" class="p-2 border rounded w-1/3" />
        <button @click="disbursementPhases.splice(index, 1)" class="text-red-500">Remove</button>
      </div>
      <button @click="disbursementPhases.push({ month: null, percent: null })" class="bg-blue-500 text-white p-2 rounded">Add Phase</button>
    </div>

    <div>
      <h2 class="font-bold text-xl mt-6">Lump Sum Payments</h2>
      <div v-for="(entry, index) in lumpSums" :key="index" class="flex gap-2 mb-2">
        <input v-model.number="entry.month" placeholder="Month" type="number" class="p-2 border rounded w-1/2" />
        <input v-model.number="entry.amount" placeholder="Amount" type="number" class="p-2 border rounded w-1/2" />
        <button @click="lumpSums.splice(index, 1)" class="text-red-500">Remove</button>
      </div>
      <button @click="lumpSums.push({ month: null, amount: null })" class="bg-blue-500 text-white p-2 rounded">Add Lump Sum</button>
    </div>

    <button @click="calculatePlan" class="mt-6 bg-green-600 text-white p-3 rounded">Calculate Plan</button>

    <div v-if="schedule.length" class="mt-8">
      <h2 class="text-2xl font-semibold">Amortization Schedule</h2>
      <canvas id="loanChart" class="my-8 w-full h-64"></canvas>
      <table class="w-full text-left border mt-4">
        <thead>
          <tr>
            <th class="border p-2">Month</th>
            <th class="border p-2">EMI</th>
            <th class="border p-2">Principal</th>
            <th class="border p-2">Interest</th>
            <th class="border p-2">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in schedule" :key="idx">
            <td class="border p-2">{{ row.month }}</td>
            <td class="border p-2">₹{{ row.emi.toFixed(2) }}</td>
            <td class="border p-2">₹{{ row.principal.toFixed(2) }}</td>
            <td class="border p-2">₹{{ row.interest.toFixed(2) }}</td>
            <td class="border p-2">₹{{ row.balance.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import Chart from 'chart.js/auto';

export default {
  data() {
    return {
      loanType: 'full',
      approvedAmount: 5000000,
      loanTerm: 240,
      interestRate: 8,
      recurringExtraPayment: 0,
      lumpSums: [],
      disbursementPhases: [],
      schedule: []
    };
  },
  methods: {
    calculatePlan() {
      let disbursedMap = {};
      if (this.loanType === 'phased') {
        this.disbursementPhases.forEach(phase => {
          disbursedMap[phase.month] = (phase.percent / 100) * this.approvedAmount;
        });
      } else {
        disbursedMap[1] = this.approvedAmount;
      }

      const r = this.interestRate / 12 / 100;
      let balance = 0;
      let month = 1;
      let lumpsumMap = Object.fromEntries(this.lumpSums.map(ls => [ls.month, ls.amount]));
      const schedule = [];

      while (month <= 1000 && (balance > 0 || disbursedMap[month])) {
        if (disbursedMap[month]) {
          balance += disbursedMap[month];
        }

        const interest = balance * r;
        const emi = balance > 0 ? (balance * r * Math.pow(1 + r, this.loanTerm)) / (Math.pow(1 + r, this.loanTerm) - 1) : 0;
        let principal = emi - interest;
        let extra = this.recurringExtraPayment || 0;

        if (lumpsumMap[month]) {
          extra += lumpsumMap[month];
        }

        if (principal + extra > balance) {
          principal = balance;
          extra = 0;
        }

        schedule.push({
          month,
          emi: emi + extra,
          principal: principal + extra,
          interest,
          balance: balance - principal - extra
        });

        balance -= (principal + extra);
        month++;
      }

      this.schedule = schedule;
      this.renderChart();
    },
    renderChart() {
      const ctx = document.getElementById('loanChart');
      if (!ctx) return;
      const months = this.schedule.map(r => r.month);
      const principalData = this.schedule.map(r => r.principal);
      const interestData = this.schedule.map(r => r.interest);

      if (this.chart) this.chart.destroy();
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Principal',
              data: principalData,
              borderColor: 'green',
              fill: false
            },
            {
              label: 'Interest',
              data: interestData,
              borderColor: 'red',
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' }
          },
          scales: {
            x: { title: { display: true, text: 'Month' } },
            y: { title: { display: true, text: 'Amount (₹)' } }
          }
        }
      });
    }
  }
};
</script>

<style scoped>
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
</style>
