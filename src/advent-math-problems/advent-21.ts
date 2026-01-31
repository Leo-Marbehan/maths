const knownPrimes = new Set<number>();

function isPrime(n: number) {
  if (knownPrimes.has(n)) return true;

  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) {
      return false;
    }
  }

  knownPrimes.add(n);

  return true;
}

function reverse(n: number) {
  let reversed = 0;
  while (n > 0) {
    reversed = reversed * 10 + (n % 10);
    n = Math.floor(n / 10);
  }
  return reversed;
}

function sumPrimesBelow(n: number) {
  let sum = 0;
  for (let i = 2; i < n; i++) {
    if (isPrime(i)) {
      sum += i;
    }
  }
  return sum;
}

function filter(max: number) {
  console.log(`Filtering from 2 to ${max} (${max - 1} numbers)`);

  let remaining = [];

  for (let i = 2; i <= max; i++) {
    if (isPrime(i)) {
      remaining.push(i);
    }
  }

  console.log(`${remaining.length} prime number found below ${max}`);
  console.log(remaining);
  console.log(remaining.map((n) => ({ n, sum: sumPrimesBelow(n) })));

  remaining = remaining.filter((n) => isPrime(reverse(n)));

  console.log(`${remaining.length} numbers left with prime reverses`);
  console.log(remaining);

  remaining = remaining.filter((n) => sumPrimesBelow(n) % n === 0);

  console.log(
    `${remaining.length} numbers left that divide the sum of lower primes`,
  );
  console.log(remaining);
}

export function main() {
  filter(100);
}
