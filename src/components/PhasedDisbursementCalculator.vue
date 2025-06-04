<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block font-semibold">Approved Loan Amount</label>
        <input v-model.number="approvedAmount" type="number" class="w-full p-2 border rounded" />
      </div>
      <div>
        <label class="block font-semibold">Interest Rate (% annual)</label>
        <input v-model.number="interestRate" type="number" class="w-full p-2 border rounded" />
      </div>
    </div>

    <div>
      <h3 class="text-lg font-bold">Disbursement Phases</h3>
      <div v-for="(phase, index) in disbursements" :key="index" class="flex gap-2 my-2">
        <input v-model.number="phase.month" type="number" placeholder="Disburse at month" class="p-2 border rounded w-1/3" />
        <input v-model.number="phase.percent" type="number" placeholder="% of approved amount" class="p-2 border rounded w-1/3" />
        <button @click="disbursements.splice(index, 1)" class="text-red-500">Remove</button>
      </div>
      <button @click="disbursements.push({ month: null, percent: null })" class="bg-blue-600 text-white px-4 py-2 rounded">
        Add Phase
      </button>
    </div>

    <div>
      <h3 class="font-semibold mt-4">Monthly Extra Payment</h3>
      <input v-model.number="monthlyExtra" type="number" class="p-2 border rounded w-full md:w-1/2" />
    </div>

    <div>
      <h3 class="font-semibold mt-4">One-time Lump Sum Payments</h3>
      <div v-for="(lump, index) in oneTimeLumps" :key="index" class="flex gap-2 my-2">
        <input v-model.number="lump.month" placeholder="Month" type="number" class="p-2 border rounded w-1/3" />
        <input v-model.number="lump.amount" placeholder="Amount" type="number" class="p-2 border rounded w-1/3" />
        <button @click="oneTimeLumps.splice(index, 1)" class="text-red-500">Remove</button>
      </div>
      <button @click="oneTimeLumps.push({ month: null, amount: null })" class="bg-blue-600 text-white px-4 py-2 rounded">
        Add Lump Sum
      </button>
    </div>

    <button @click="calculate" class="bg-green-600 text-white p-3 rounded">Calculate</button>

    <div v-if="summary">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div v-for="(phase, i) in summary.phases" :key="i" class="bg-gray-100 p-4 rounded shadow">
          <div class="font-semibold">Phase {{ i + 1 }}</div>
          <p>Disbursed ₹{{ phase.amount }}</p>
          <p>EMI ₹{{ phase.emi.toFixed(2) }}</p>
          <p>Term: {{ phase.term }} months</p>
        </div>
      </div>

      <canvas id="phasedStackedBarChart" class="mt-10"></canvas>
      <canvas id="phasedBalanceTrendChart" class="mt-10"></canvas>

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
      approvedAmount: 1000000,
      interestRate: 10,
      disbursements: [{ month: 1, percent: 35 }, { month: 13, percent: 30 }, { month: 19, percent: 35 }],
      monthlyExtra: 0,
      oneTimeLumps: [],
      schedule: [],
      summary: null
    };
  },
  methods: {
    calculate() {
      const r = this.interestRate / 12 / 100;
      const lumpMap = Object.fromEntries(this.oneTimeLumps.map(e => [e.month, e.amount]));
      const sortedDisbursals = [...this.disbursements].sort((a, b) => a.month - b.month);
      const schedule = [];
      let disbursed = 0;
      let disbursedTotal = 0;
      let emi = 0;
      let term = 240;
      let balance = 0;
      let currentPhase = 0;
      const phases = [];

      for (let month = 1; month <= 1000 && (balance > 0 || currentPhase < sortedDisbursals.length); month++) {
        if (currentPhase < sortedDisbursals.length && sortedDisbursals[currentPhase].month === month) {
          const amount = (sortedDisbursals[currentPhase].percent / 100) * this.approvedAmount;
          balance += amount;
          disbursedTotal += amount;
          emi = (balance * r * term) / (Math.pow(1 + r, term) - 1);
          phases.push({ amount, emi, term });
          currentPhase++;
        }

        const interest = balance * r;
        let principal = emi - interest;
        const extra = this.monthlyExtra || 0;
        const lump = lumpMap[month] || 0;

        if (principal + extra + lump > balance) {
          principal = balance;
        }

        schedule.push({
          month,
          principal,
          interest,
          extra,
          lump,
          balance: balance - principal - extra - lump
        });

        balance -= (principal + extra + lump);
        if (balance <= 0) break;
      }

      this.schedule = schedule;
      this.summary = { phases };

      this.$nextTick(() => this.renderCharts());
    },
    renderCharts() {
      const ctx1 = document.getElementById('phasedStackedBarChart');
      const ctx2 = document.getElementById('phasedBalanceTrendChart');
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
          datasets: [{
            label: 'Outstanding Balance',
            data: data.map(e => e.balance),
            borderColor: 'purple',
            backgroundColor: 'purple',
            fill: false
          }]
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
