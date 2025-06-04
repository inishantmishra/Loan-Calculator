<template>
  <div class="max-w-7xl mx-auto p-6 bg-sky-50 min-h-screen rounded-xl shadow-md">
    <h1 class="text-4xl font-bold mb-8 text-center text-sky-700">Loan Prepayment Planner</h1>
    <div class="mb-6 flex justify-center space-x-4">
      <button
        class="px-6 py-3 rounded-full transition-colors duration-300"
        :class="selectedTab === 'full' ? 'bg-sky-700 text-white shadow-lg' : 'bg-white text-sky-700 border border-sky-300'"
        @click="selectedTab = 'full'"
      >
        Full Disbursement
      </button>
      <button
        class="px-6 py-3 rounded-full transition-colors duration-300"
        :class="selectedTab === 'phased' ? 'bg-sky-700 text-white shadow-lg' : 'bg-white text-sky-700 border border-sky-300'"
        @click="selectedTab = 'phased'"
      >
        Phased Disbursement
      </button>
    </div>

    <div class="bg-white p-8 rounded-lg shadow-lg">
      <div v-if="selectedTab === 'full'">
        <FullDisbursementCalculator />
      </div>
      <div v-else>
        <PhasedDisbursementCalculator />
      </div>
    </div>
  </div>
</template>

<script>
import FullDisbursementCalculator from './components/FullDisbursementCalculator.vue';
import PhasedDisbursementCalculator from './components/PhasedDisbursementCalculator.vue';

export default {
  components: {
    FullDisbursementCalculator,
    PhasedDisbursementCalculator
  },
  data() {
    return {
      selectedTab: 'full'
    };
  }
};
</script>

<style scoped>
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f0f9ff;
  color: #1e293b;
}
button {
  font-weight: 600;
}
canvas {
  background-color: white;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
}
</style>
