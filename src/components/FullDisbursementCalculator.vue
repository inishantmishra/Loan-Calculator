<template>
  <div class="space-y-8">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block font-semibold text-sky-700">Loan Amount</label>
        <input v-model.number="loanAmount" type="number" class="w-full p-2 border rounded shadow-sm" />
      </div>
      <div>
        <label class="block font-semibold text-sky-700">Interest Rate (% annual)</label>
        <input v-model.number="interestRate" type="number" class="w-full p-2 border rounded shadow-sm" />
      </div>
      <div>
        <label class="block font-semibold text-sky-700">Loan Term (months)</label>
        <input v-model.number="loanTerm" type="number" class="w-full p-2 border rounded shadow-sm" />
      </div>
      <div>
        <label class="block font-semibold text-sky-700">Monthly Extra Payment</label>
        <input v-model.number="monthlyExtra" type="number" class="w-full p-2 border rounded shadow-sm" />
      </div>
    </div>

    <div>
      <h3 class="font-bold text-xl text-sky-700">Recurring Lump Sum</h3>
      <input v-model.number="recurringLump.amount" placeholder="Amount" type="number" class="p-2 border rounded shadow-sm w-1/3" />
      <input v-model.number="recurringLump.every" placeholder="Every X months" type="number" class="p-2 border rounded shadow-sm w-1/3" />
    </div>

    <div>
      <h3 class="font-bold text-xl text-sky-700">One-time Lump Sum Payments</h3>
      <div v-for="(lump, index) in oneTimeLumps" :key="index" class="flex gap-2 mb-2">
        <input v-model.number="lump.month" placeholder="Month" type="number" class="p-2 border rounded shadow-sm w-1/3" />
        <input v-model.number="lump.amount" placeholder="Amount" type="number" class="p-2 border rounded shadow-sm w-1/3" />
        <button @click="oneTimeLumps.splice(index, 1)" class="text-red-600">Remove</button>
      </div>
      <button @click="oneTimeLumps.push({ month: null, amount: null })" class="bg-sky-600 text-white px-4 py-2 rounded">Add Lump Sum</button>
    </div>

    <button @click="calculate" class="bg-green-600 text-white p-3 rounded shadow">Calculate Plan</button>

    <div v-if="summary" class="mt-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white border rounded-lg p-4 shadow text-center">
          <h4 class="font-semibold text-gray-500 text-sm">Monthly EMI</h4>
          <p class="text-xl font-bold text-sky-700">₹{{ summary.emi.toFixed(2) }}</p>
        </div>
        <div class="bg-white border rounded-lg p-4 shadow text-center">
          <h4 class="font-semibold text-gray-500 text-sm">Total Interest</h4>
          <p class="text-xl font-bold text-sky-700">₹{{ summary.totalInterest.toFixed(2) }}</p>
        </div>
        <div class="bg-white border rounded-lg p-4 shadow text-center">
          <h4 class="font-semibold text-gray-500 text-sm">Duration</h4>
          <p class="text-xl font-bold text-sky-700">{{ schedule.length }} months</p>
        </div>
        <div class="bg-white border rounded-lg p-4 shadow text-center">
          <h4 class="font-semibold text-gray-500 text-sm">Months Saved</h4>
          <p class="text-xl font-bold text-sky-700">{{ summary.monthsSaved }}</p>
        </div>
      </div>

      <canvas id="barChart" class="mt-10"></canvas>
      <canvas id="lineChart" class="mt-10"></canvas>

      <h3 class="font-bold text-xl mt-8 text-sky-700">Amortization Schedule</h3>
      <table class="w-full mt-4 table-auto border">
        <thead>
          <tr>
            <th class="border px-2 py-1">Month</th>
            <th class="border px-2 py-1">AMI</th>
            <th class="border px-2 py-1">Principal</th>
            <th class="border px-2 py-1">Interest</th>
            <th class="border px-2 py-1">Extra</th>
            <th class="border px-2 py-1">Lump Sum</th>
            <th class="border px-2 py-1">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in schedule" :key="row.month">
            <td class="border px-2 py-1">{{ row.month }}</td>
            <td class="border px-2 py-1">₹{{ row.ami.toFixed(2) }}</td>
            <td class="border px-2 py-1">₹{{ row.principal.toFixed(2) }}</td>
            <td class="border px-2 py-1">₹{{ row.interest.toFixed(2) }}</td>
            <td class="border px-2 py-1">₹{{ row.extra.toFixed(2) }}</td>
            <td class="border px-2 py-1">₹{{ row.lump.toFixed(2) }}</td>
            <td class="border px-2 py-1">₹{{ row.balance.toFixed(2) }}</td>
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
      loanAmount: 1000000,
      interestRate: 8,
      loanTerm: 240,
      monthlyExtra: 0,
      recurringLump: { amount: 0, every: 0 },
      oneTimeLumps: [],
      schedule: [],
      summary: null,
      barChart: null,
      lineChart: null
    };
  },
  methods: {
    calculate() {
      const r = this.interestRate / 12 / 100;
      const emi = (this.loanAmount * r * Math.pow(1 + r, this.loanTerm)) / (Math.pow(1 + r, this.loanTerm) - 1);

      let balance = this.loanAmount;
      const lumpMap = Object.fromEntries(this.oneTimeLumps.map(e => [e.month, e.amount]));
      const schedule = [];
      let month = 1;
      let totalInterest = 0;

      while (balance > 0 && month <= 1000) {
        const interest = balance * r;
        let principal = emi - interest;
        let extra = this.monthlyExtra;
        let lump = 0;

        if (this.recurringLump.every && month % this.recurringLump.every === 0) {
          lump += this.recurringLump.amount;
        }

        if (lumpMap[month]) {
          lump += lumpMap[month];
        }

        let totalPay = principal + extra + lump;
        if (totalPay > balance) {
          principal = balance;
          extra = 0;
          lump = 0;
        }

        schedule.push({
          month,
          ami: emi,
          principal,
          interest,
          extra,
          lump,
          balance: balance - (principal + extra + lump)
        });

        balance -= (principal + extra + lump);
        totalInterest += interest;
        month++;
      }

      this.schedule = schedule;
      this.summary = {
        emi,
        totalInterest,
        monthsSaved: this.loanTerm - schedule.length
      };

      this.$nextTick(this.renderCharts);
    },
    renderCharts() {
      if (this.barChart) this.barChart.destroy();
      if (this.lineChart) this.lineChart.destroy();

      const labels = this.schedule.map(r => `M${r.month}`);
      const data = this.schedule;

      this.barChart = new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Principal', data: data.map(r => r.principal), backgroundColor: '#38bdf8', stack: 'stack' },
            { label: 'Interest', data: data.map(r => r.interest), backgroundColor: '#7dd3fc', stack: 'stack' },
            { label: 'Extra', data: data.map(r => r.extra), backgroundColor: '#bae6fd', stack: 'stack' },
            { label: 'Lump Sum', data: data.map(r => r.lump), backgroundColor: '#e0f2fe', stack: 'stack' }
          ]
        },
        options: {
          plugins: { legend: { position: 'top' } },
          responsive: true,
          scales: { x: { stacked: true }, y: { stacked: true } }
        }
      });

      this.lineChart = new Chart(document.getElementById('lineChart'), {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Outstanding Balance',
              data: data.map(r => r.balance),
              borderColor: '#0ea5e9',
              backgroundColor: '#0ea5e9',
              fill: false
            }
          ]
        },
        options: {
          plugins: { legend: { position: 'top' } },
          responsive: true,
          scales: {
            x: { title: { display: true, text: 'Month' } },
            y: { title: { display: true, text: 'Balance (₹)' } }
          }
        }
      });
    }
  }
};
</script>

<style scoped>
canvas {
  background-color: #fff;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
}
</style>
