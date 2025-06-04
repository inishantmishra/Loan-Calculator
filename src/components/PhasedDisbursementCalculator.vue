<template>
  <div class="space-y-8">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block font-semibold text-sky-700">Approved Loan Amount</label>
        <input v-model.number="approvedAmount" type="number" class="w-full p-2 border rounded shadow-sm" />
      </div>
      <div>
        <label class="block font-semibold text-sky-700">Loan Term (months)</label>
        <input v-model.number="loanTerm" type="number" class="w-full p-2 border rounded shadow-sm" />
      </div>
      <div>
        <label class="block font-semibold text-sky-700">Interest Rate (% annual)</label>
        <input v-model.number="interestRate" type="number" class="w-full p-2 border rounded shadow-sm" />
      </div>
      <div>
        <label class="block font-semibold text-sky-700">Monthly Extra Payment</label>
        <input v-model.number="monthlyExtra" type="number" class="w-full p-2 border rounded shadow-sm" />
      </div>
    </div>

    <div>
      <h3 class="font-bold text-xl text-sky-700">Disbursement Phases</h3>
      <div v-for="(phase, index) in disbursements" :key="index" class="flex gap-2 mb-2">
        <input v-model.number="phase.month" placeholder="Month" type="number" class="p-2 border rounded shadow-sm w-1/3" />
        <input v-model.number="phase.percent" placeholder="% of loan" type="number" class="p-2 border rounded shadow-sm w-1/3" />
        <button @click="disbursements.splice(index, 1)" class="text-red-500">Remove</button>
      </div>
      <button @click="disbursements.push({ month: null, percent: null })" class="bg-sky-600 text-white px-4 py-2 rounded">Add Phase</button>
    </div>

    <div>
      <h3 class="font-bold text-xl text-sky-700">One-time Lump Sum Payments</h3>
      <div v-for="(lump, index) in oneTimeLumps" :key="index" class="flex gap-2 mb-2">
        <input v-model.number="lump.month" placeholder="Month" type="number" class="p-2 border rounded shadow-sm w-1/3" />
        <input v-model.number="lump.amount" placeholder="Amount" type="number" class="p-2 border rounded shadow-sm w-1/3" />
        <button @click="oneTimeLumps.splice(index, 1)" class="text-red-500">Remove</button>
      </div>
      <button @click="oneTimeLumps.push({ month: null, amount: null })" class="bg-sky-600 text-white px-4 py-2 rounded">Add Lump Sum</button>
    </div>

    <button @click="calculate" class="bg-green-600 text-white p-3 rounded shadow">Calculate Plan</button>

    <div v-if="summary.length" class="mt-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="(phase, i) in summary" :key="i" class="bg-white border rounded-lg p-4 shadow text-center">
          <h4 class="font-semibold text-gray-500 text-sm">Phase {{ i + 1 }}</h4>
          <p>Disbursed ₹{{ phase.amount }}</p>
          <p>EMI ₹{{ phase.emi.toFixed(2) }}</p>
          <p>From Month {{ phase.month }}</p>
        </div>
      </div>

      <canvas id="phaseBarChart" class="mt-10"></canvas>
      <canvas id="phaseLineChart" class="mt-10"></canvas>

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
      approvedAmount: 1000000,
      loanTerm: 240,
      interestRate: 8,
      monthlyExtra: 0,
      disbursements: [{ month: 1, percent: 35 }],
      oneTimeLumps: [],
      schedule: [],
      summary: [],
      phaseBarChart: null,
      phaseLineChart: null
    };
  },
  methods: {
    calculate() {
      const r = this.interestRate / 12 / 100;
      const sortedPhases = [...this.disbursements].sort((a, b) => a.month - b.month);
      const lumpMap = Object.fromEntries(this.oneTimeLumps.map(e => [e.month, e.amount]));

      let schedule = [];
      let balance = 0;
      let emi = 0;
      let phaseIndex = 0;
      const summary = [];
      let month = 1;

      while (month <= 1000 && (balance > 0 || phaseIndex < sortedPhases.length)) {
        if (phaseIndex < sortedPhases.length && sortedPhases[phaseIndex].month === month) {
          const amount = (sortedPhases[phaseIndex].percent / 100) * this.approvedAmount;
          balance += amount;
          emi = (balance * r * this.loanTerm) / (Math.pow(1 + r, this.loanTerm) - 1);
          summary.push({ amount, emi, month });
          phaseIndex++;
        }

        const interest = balance * r;
        let principal = emi - interest;
        let extra = this.monthlyExtra;
        let lump = lumpMap[month] || 0;

        const totalPayment = principal + extra + lump;
        if (totalPayment > balance) {
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
        if (balance <= 0) break;
        month++;
      }

      this.schedule = schedule;
      this.summary = summary;
      this.$nextTick(this.renderCharts);
    },
    renderCharts() {
      if (this.phaseBarChart) this.phaseBarChart.destroy();
      if (this.phaseLineChart) this.phaseLineChart.destroy();

      const labels = this.schedule.map(r => `M${r.month}`);
      const data = this.schedule;

      this.phaseBarChart = new Chart(document.getElementById('phaseBarChart'), {
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

      this.phaseLineChart = new Chart(document.getElementById('phaseLineChart'), {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Outstanding Balance',
            data: data.map(r => r.balance),
            borderColor: '#0ea5e9',
            backgroundColor: '#0ea5e9',
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

<style scoped>
canvas {
  background-color: #fff;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
}
</style>
