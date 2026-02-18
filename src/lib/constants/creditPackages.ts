export const CREDIT_PACKAGES = {
    'intro': {
        name: 'Oasis Intro Pass',
        credits: 1,
        price: 2700, // in cents
    },
    'flow': {
        name: 'Oasis Flow Pass',
        credits: 5,
        price: 12500,
    },
    'core': {
        name: 'Oasis Core Pass',
        credits: 10,
        price: 23000,
    },
    'balance': {
        name: 'Oasis Balance Builder',
        credits: 25,
        price: 50000,
    },
    'unlimited': {
        name: 'Oasis Unlimited Movement Pass',
        credits: 999999, // unlimited representation? or just a flag. For now, high number.
        price: 250000,
    },
    'private': {
        name: 'Private Experience',
        credits: 0, // Special handling
        price: 0, // Variable
    }
} as const;

export type PackageId = keyof typeof CREDIT_PACKAGES;
