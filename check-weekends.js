import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./src/data/journalData.json', 'utf-8'));

let totalHours = 0;
let weekendCount = 0;
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

data.entries.forEach(entry => {
  const date = new Date(entry.date);
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  
  if (isWeekend) {
    console.log(`${entry.date} (${dayNames[day]}) - ${entry.hoursWorked} hours`);
    weekendCount++;
  }
  
  if (!entry.isHoliday && !isWeekend) {
    totalHours += entry.hoursWorked;
  }
});

console.log(`\nWeekend entries found: ${weekendCount}`);
console.log(`Total hours (excluding weekends): ${totalHours}`);
console.log(`Remaining: ${500 - totalHours}`);
