<template>
  <div class="max-w-7xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6 text-center">Loan Prepayment Planner</h1>
    <div class="mb-6">
      <button
        class="px-4 py-2 mr-2 rounded bg-blue-600 text-white"
        :class="{ 'bg-blue-800': selectedTab === 'full' }"
        @click="selectedTab = 'full'"
      >
        Full Disbursement
      </button>
      <button
        class="px-4 py-2 rounded bg-blue-600 text-white"
        :class="{ 'bg-blue-800': selectedTab === 'phased' }"
        @click="selectedTab = 'phased'"
      >
        Phased Disbursement
      </button>
    </div>

    <div v-if="selectedTab === 'full'">
      <FullDisbursementCalculator />
    </div>
    <div v-else>
      <PhasedDisbursementCalculator />
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
}
</style>
