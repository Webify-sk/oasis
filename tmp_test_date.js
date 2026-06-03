const { formatInTimeZone } = require('date-fns-tz');
const { sk } = require('date-fns/locale');

const date = '2026-05-28T16:00:00Z'; // e.g. Thursday 18:00
const dayNameLower = formatInTimeZone(date, 'Europe/Bratislava', 'EEEE', { locale: sk });
const dayName = dayNameLower.charAt(0).toUpperCase() + dayNameLower.slice(1);

const timeString = formatInTimeZone(date, 'Europe/Bratislava', 'HH:mm');
const dateString = formatInTimeZone(date, 'Europe/Bratislava', 'yyyy-MM-dd');

console.log({
    dayNameLower,
    dayName,
    timeString,
    dateString
});
