import { getRealUtcDate } from './src/utils/booking-logic';

function runTest() {
    const input = '2026-03-13T09:00:00';
    console.log('Input String:', input);

    const plainDate = new Date(input);
    console.log('Date(input):', plainDate.toISOString(), plainDate.toLocaleString());

    const realUtc = getRealUtcDate(input);
    console.log('getRealUtcDate:', realUtc.toISOString());
}

runTest();
