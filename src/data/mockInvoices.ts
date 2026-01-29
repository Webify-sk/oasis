export interface Invoice {
    id: string;
    invoiceNumber: string;
    hours: number;
    amount: number;
    date: string;
}

export const mockInvoices: Invoice[] = [
    { id: '1', invoiceNumber: '12345678', hours: 5, amount: 110, date: '12.8.2024' },
    { id: '2', invoiceNumber: '12345678', hours: 5, amount: 110, date: '12.8.2024' },
    { id: '3', invoiceNumber: '12345678', hours: 5, amount: 110, date: '12.8.2024' },
    { id: '4', invoiceNumber: '12345678', hours: 5, amount: 110, date: '12.8.2024' },
    { id: '5', invoiceNumber: '12345678', hours: 5, amount: 110, date: '12.8.2024' },
];
