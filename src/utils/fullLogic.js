export function calculateFullSchedule({ loanAmount, interestRate, loanTerm, comfortableEmi, monthlyExtra, emiIncreaseRate, lumpSums }) {
  // Dummy placeholder logic
  const emi = (loanAmount * interestRate / 1200) / (1 - Math.pow(1 + interestRate / 1200, -loanTerm));
  const schedule = [];
  let balance = loanAmount;
  let totalInterest = 0;
  for (let month = 1; month <= loanTerm && balance > 0; month++) {
    const monthlyRate = interestRate / 1200;
    const interest = balance * monthlyRate;
    let principal = emi - interest;
    let extra = monthlyExtra;
    const comfortable = Math.max(emi, comfortableEmi);
    lumpSums.forEach(ls => {
      if (ls.recurring && ((month - ls.month) % ls.repeat === 0 || month === ls.month)) {
        extra += ls.amount;
      } else if (!ls.recurring && month === ls.month) {
        extra += ls.amount;
      }
    });
    const paid = comfortable + extra;
    if (paid > balance + interest) {
      principal = balance;
    } else {
      principal = paid - interest;
    }
    balance -= principal;
    totalInterest += interest;
    schedule.push({
      month, emi: paid, interest, principal, extra, balance: Math.max(balance, 0),
    });
  }
  return {
    summary: {
      emi,
      totalInterest,
      duration: schedule.length,
      monthsSaved: loanTerm - schedule.length,
      schedule,
    },
  };
}

export function downloadCSVFile(data, filename) {
  const csvContent = [
    ['Month', 'EMI', 'Principal', 'Interest', 'Extra', 'Balance'],
    ...data.map(d => [d.month, d.emi.toFixed(2), d.principal.toFixed(2), d.interest.toFixed(2), d.extra.toFixed(2), d.balance.toFixed(2)])
  ].map(e => e.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function renderCharts(data, barId, lineId) {
  if (!window.Chart) return;

  const barCtx = document.getElementById(barId)?.getContext('2d');
  const lineCtx = document.getElementById(lineId)?.getContext('2d');

  if (barCtx) {
    new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.month),
        datasets: [
          { label: 'Principal', data: data.map(d => d.principal), backgroundColor: '#60a5fa' },
          { label: 'Interest', data: data.map(d => d.interest), backgroundColor: '#f87171' },
          { label: 'Extra', data: data.map(d => d.extra), backgroundColor: '#34d399' }
        ]
      },
      options: { responsive: true, stacked: true }
    });
  }

  if (lineCtx) {
    new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: data.map(d => d.month),
        datasets: [{ label: 'Outstanding Balance', data: data.map(d => d.balance), borderColor: '#3b82f6', fill: false }]
      },
      options: { responsive: true }
    });
  }
}
