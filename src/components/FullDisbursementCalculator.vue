<template>
  <div class="space-y-8">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block font-semibold">Loan Amount</label>
        <input v-model.number="loanAmount" type="number" class="w-full p-2 border rounded" />
      </div>
      <div>
        <label class="block font-semibold">Interest Rate (% annual)</label>
        <input v-model.number="interestRate" type="number" class="w-full p-2 border rounded" />
      </div>
      <div>
        <label class="block font-semibold">Loan Term (months)</label>
        <input v-model.number="loanTerm" type="number" class="w-full p-2 border rounded" />
      </div>
      <div>
        <label class="block font-semibold">Monthly Extra Payment (optional)</label>
        <input v-model.number="monthlyExtra" type="number" class="w-full p-2 border rounded" />
      </div>
    </div>

    <div>
      <h3 class="font-bold text-xl mb-2">Recurring Lump Sum Payments</h3>
      <input v-model.number="recurringLump.amount" placeholder="Amount" type="number" class="p-2 border rounded w-1/3" />
      <input v-model.number="recurringLump.every" placeholder="Every X months" type="number" class="p-2 border rounded w-1/3" />
    </div>

    <div>
      <h3 class="font-bold text-xl mb-2">One-time Lump Sum Payments</h3>
      <div v-for="(lump, index) in oneTimeLumps" :key="index" class="flex gap-2 mb-2">
        <input v-model.number="lump.month" placeholder="Month" type="number" class="p-2 border rounded w-1/3" />
        <input v-model.number="lump.amount" placeholder="Amount" type="number" class="p-2 border rounded w-1/3" />
        <button @click="oneTimeLumps.splice(index, 1)" class="text-red-600">Remove</button>
      </div>
      <button @click="oneTimeLumps.push({ month: null, amount: null })" class="bg-blue-500 text-white px-4 py-2 rounded">Add</button>
    </div>

    <button @click="calculate" class="bg-green-600 text-white p-3 rounded">Calculate Plan</button>

    <div v-if="summary">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <div class="bg-gray-100 p-4 rounded shadow">
          <div class="font-semibold text-sm">Monthly EMI</div>
          <div class="text-lg font-bold">₹{{ summary.emi.toFixed(2) }}</div>
        </div>
        <div class="bg-gray-100 p-4 rounded shadow">
          <div class="font-semibold text-sm">Interest Paid</div>
          <div class="text-lg font-bold">₹{{ summary.totalInterest.toFixed(2) }}</div>
        </div>
        <div class="bg-gray-100 p-4 rounded shadow">
          <div class="font-semibold text-sm">Months Saved</div>
          <div class="text-lg font-bold">{{ summary.monthsSaved }}</div>
        </div>
        <div class="bg-gray-100 p-4 rounded shadow">
          <div class="font-semibold text-sm">Total Duration</div>
          <div class="text-lg font-bold">{{ schedule.length }} months</div>
        </div>
      </div>

      <canvas id="stackedBarChart" class="mt-10"></canvas>
      <canvas id="balanceTrendChart" class="mt-10"></canvas>

      <h3 class="font-bold text-xl mt-8 mb-2">Amortization Schedule</h3>
      <table class="w-full table-auto text-left border">
        <thead>
          <tr>
            <th class="border px-2 py-1">Month</th>
            <th class="border px-2 py-1">Principal</th>
            <th class="border px-2 py-1">Interest</th>
            <th class="border px-2 py-1">Extra</th>
            <th class="border px-2 py-1">Lump Sum</th>
            <th class="border px-2 py-1">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in schedule" :key="i">
            <td class="border px-2 py-1">{{ row.month }}</td>
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
      loanAmount: 100000,
      interestRate: 10,
      loanTerm: 12,
      monthlyExtra: 0,
      oneTimeLumps: [],
      recurringLump: { amount: 0, every: 0 },
      schedule: [],
      summary: null
    };
  },
  methods: {
    calculate() {
      const r = this.interestRate / 12 / 100;
      const emi = (this.loanAmount * r * Math.pow(1 + r, this.loanTerm)) / (Math.pow(1 + r, this.loanTerm) - 1);

      let balance = this.loanAmount;
      const lumpMap = Object.fromEntries(this.oneTimeLumps.map(e => [e.month, e.amount]));
      let schedule = [];
      let month = 1;
      let totalInterest = 0;
      const originalTerm = this.loanTerm;

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

        const totalPayment = principal + extra + lump;
        if (totalPayment > balance) {
          principal = balance;
          extra = 0;
          lump = 0;
        }

        schedule.push({
          month,
          emi,
          principal,
          interest,
          extra,
          lump,
          balance: balance - principal - extra - lump
        });

        balance -= (principal + extra + lump);
        totalInterest += interest;
        month++;
      }

      this.schedule = schedule;
      this.summary = {
        emi,
        totalInterest,
        monthsSaved: originalTerm - schedule.length
      };

      this.$nextTick(() => {
        this.renderCharts();
      });
    },
    renderCharts() {
      const ctx1 = document.getElementById('stackedBarChart');
      const ctx2 = document.getElementById('balanceTrendChart');
      if (!ctx1 || !ctx2) return;

      const labels = this.schedule.map(e => `M${e.month}`);
      const data = this.schedule;

      if (this.barChart) this.barChart.destroy();
      if (this.lineChart) this.lineChart.destroy();

      this.barChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Principal', data: data.map(e => e.principal), backgroundColor: 'green', stack: 'stack' },
            { label: 'Interest', data: data.map(e => e.interest), backgroundColor: 'red', stack: 'stack' },
            { label: 'Extra', data: data.map(e => e.extra), backgroundColor: 'blue', stack: 'stack' },
            { label: 'Lump Sum', data: data.map(e => e.lump), backgroundColor: 'orange', stack: 'stack' }
          ]
        },
        options: {
          plugins: { legend: { position: 'top' } },
          responsive: true,
          scales: { x: { stacked: true }, y: { stacked: true } }
        }
      });

      this.lineChart = new Chart(ctx2, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Outstanding Balance',
              data: data.map(e => e.balance),
              borderColor: 'purple',
              backgroundColor: 'purple',
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
