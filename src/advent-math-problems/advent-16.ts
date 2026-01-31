function sumDigits(n: number) {
  let sum = 0;
  while (n > 0) {
    sum += n % 10;
    n = Math.floor(n / 10);
  }
  return sum;
}

function reverse(n: number) {
  let reversed = 0;
  while (n > 0) {
    reversed = reversed * 10 + (n % 10);
    n = Math.floor(n / 10);
  }
  return reversed;
}

function isPalindrome(n: number) {
  return n === reverse(n);
}

function doesReversedSquareMatch(n: number) {
  const reversed = reverse(n);
  const reversedSquared = reversed * reversed;
  return reversedSquared === reverse(n * n);
}

function logDetails(n: number) {
  const digitsSum = sumDigits(n);
  const reversed = reverse(n);
  const reversedSquared = reversed * reversed;
  const squared = n * n;

  console.table({
    Number: n,
    "Digits sum": digitsSum,
    Reversed: reversed,
    "Reversed squared": reversedSquared,
    Squared: squared,
  });
}

type FilterOptions = {
  digitsSum?: number;
};

function filter(start: number, end: number, options?: FilterOptions) {
  console.log(`Filtering from ${start} to ${end} (${end - start + 1} numbers)`);

  // Merge options
  const effectiveOptions: Required<FilterOptions> = {
    digitsSum: 6,
    ...options,
  };

  // Extract options
  const digitsSum = effectiveOptions.digitsSum;

  console.log(`  Digits sum: ${digitsSum}`);

  let remaining = [];

  for (let i = start; i <= end; i++) {
    const sum = sumDigits(i);
    if (sum === digitsSum) {
      remaining.push(i);
    }
  }

  console.log(
    `${remaining.length} numbers left with digits that sum to ${digitsSum}`,
  );

  remaining = remaining.filter((n) => !isPalindrome(n));

  console.log(`${remaining.length} numbers left that are not palindromes`);

  remaining = remaining.filter(doesReversedSquareMatch);

  console.log(
    `${remaining.length} numbers left that are equal to their revered squared when squared`,
  );

  console.log(remaining);

  remaining.forEach(logDetails);
}

export function main() {
  filter(1, 2022);
}
