function getValue(position: number, solution: number[]): number {
  const value = solution[position - 1];

  if (value === undefined) {
    throw new Error(`Missing value at position ${position}`);
  }

  return value;
}

function getStringValue(position: number, solution: number[]): string {
  return getValue(position, solution).toString().padStart(2, ' ');
}

function verifyDifference(
  position1: number,
  position2: number,
  solution: number[],
): boolean {
  const value1 = getValue(position1, solution);
  const value2 = getValue(position2, solution);
  return Math.abs(value1 - value2) !== 1;
}

function verifySum(
  positions: number[],
  expected: number,
  solution: number[],
): boolean {
  let sum = 0;
  for (const position of positions) {
    sum += getValue(position, solution);
  }
  return sum === expected;
}

let recursiveCallCount = 0;

function printSolution(solution: number[]): void {
  const s1 = getStringValue(1, solution);
  const s2 = getStringValue(2, solution);
  const s3 = getStringValue(3, solution);
  const s4 = getStringValue(4, solution);
  const s5 = getStringValue(5, solution);
  const s6 = getStringValue(6, solution);
  const s7 = getStringValue(7, solution);
  const s8 = getStringValue(8, solution);
  const s9 = getStringValue(9, solution);
  const s10 = getStringValue(10, solution);
  const s11 = getStringValue(11, solution);
  const s12 = getStringValue(12, solution);
  const s13 = getStringValue(13, solution);
  const s14 = getStringValue(14, solution);
  const s15 = getStringValue(15, solution);
  const s16 = getStringValue(16, solution);
  const s17 = getStringValue(17, solution);
  const s18 = getStringValue(18, solution);
  const s19 = getStringValue(19, solution);
  const s20 = getStringValue(20, solution);
  const s21 = getStringValue(21, solution);
  const s22 = getStringValue(22, solution);

  const rows: string[] = [];

  rows.push(s2);
  rows.push(`/   \\`);
  rows.push(`${s1}      ${s3}`);
  rows.push(`|       |`);
  rows.push(`${s5}      ${s7}`);
  rows.push(`/   \\   /   \\`);
  rows.push(`${s4}      ${s6}      ${s8}`);
  rows.push(`|       |       |`);
  rows.push(`${s10}      ${s12}      ${s14}`);
  rows.push(`/   \\   /   \\   /   \\`);
  rows.push(`${s9}      ${s11}      ${s13}      ${s15}`);
  rows.push(`|       |       |       |`);
  rows.push(`${s16}      ${s18}      ${s20}      ${s22}`);
  rows.push(`\\   /   \\   /   \\   /`);
  rows.push(`${s17}      ${s19}      ${s21}\n`);

  const longest = Math.max(...rows.map((row) => row.length));

  const formattedRows = rows.map((row) => {
    const spaces = ' '.repeat(Math.round((longest - row.length) / 2));
    return `${spaces}${row}${spaces}`;
  });

  console.log(formattedRows.join('\n'));
}

function solveRecursive(solution: number[], missing: number[]): void {
  recursiveCallCount++;

  // Verify
  if (solution.length === 1) {
    if (getValue(1, solution) !== 10) {
      return;
    }
  } else if (solution.length === 2) {
    if (!verifyDifference(1, 2, solution)) {
      return;
    }
  } else if (solution.length === 3) {
    if (!verifyDifference(2, 3, solution)) {
      return;
    }
  } else if (solution.length === 4) {
    if (getValue(4, solution) !== 16) {
      return;
    }
  } else if (solution.length === 5) {
    if (
      !verifyDifference(4, 5, solution) ||
      !verifyDifference(1, 5, solution)
    ) {
      return;
    }
  } else if (solution.length === 6) {
    if (!verifyDifference(5, 6, solution)) {
      return;
    }
  } else if (solution.length === 7) {
    if (
      getValue(7, solution) !== 20 ||
      !verifyDifference(6, 7, solution) ||
      !verifyDifference(1, 7, solution) ||
      !verifySum([1, 2, 3, 5, 6, 7], 69, solution)
    ) {
      return;
    }
  } else if (solution.length === 8) {
    if (!verifyDifference(7, 8, solution)) {
      return;
    }
  } else if (solution.length === 9) {
    // Nothing to do
  } else if (solution.length === 10) {
    if (
      !verifyDifference(9, 10, solution) ||
      !verifyDifference(4, 10, solution)
    ) {
      return;
    }
  } else if (solution.length === 11) {
    if (getValue(11, solution) !== 4 || !verifyDifference(10, 11, solution)) {
      return;
    }
  } else if (solution.length === 12) {
    if (
      !verifyDifference(11, 12, solution) ||
      !verifyDifference(6, 12, solution) ||
      !verifySum([4, 5, 6, 10, 11, 12], 72, solution)
    ) {
      return;
    }
  } else if (solution.length === 13) {
    if (!verifyDifference(12, 13, solution)) {
      return;
    }
  } else if (solution.length === 14) {
    if (
      getValue(14, solution) !== 13 ||
      !verifyDifference(13, 14, solution) ||
      !verifyDifference(8, 14, solution) ||
      !verifySum([6, 7, 8, 12, 13, 14], 93, solution)
    ) {
      return;
    }
  } else if (solution.length === 15) {
    if (!verifyDifference(14, 15, solution)) {
      return;
    }
  } else if (solution.length === 16) {
    if (!verifyDifference(9, 16, solution)) {
      return;
    }
  } else if (solution.length === 17) {
    if (getValue(17, solution) !== 7 || !verifyDifference(16, 17, solution)) {
      return;
    }
  } else if (solution.length === 18) {
    if (
      !verifyDifference(17, 18, solution) ||
      !verifyDifference(11, 18, solution) ||
      !verifySum([9, 10, 11, 16, 17, 18], 56, solution)
    ) {
      return;
    }
  } else if (solution.length === 19) {
    if (getValue(19, solution) !== 12 || !verifyDifference(18, 19, solution)) {
      return;
    }
  } else if (solution.length === 20) {
    if (
      !verifyDifference(19, 20, solution) ||
      !verifyDifference(13, 20, solution) ||
      !verifySum([11, 12, 13, 18, 19, 20], 73, solution)
    ) {
      return;
    }
  } else if (solution.length === 21) {
    if (!verifyDifference(20, 21, solution)) {
      return;
    }
  } else if (solution.length === 22) {
    if (
      getValue(22, solution) !== 9 ||
      !verifyDifference(21, 22, solution) ||
      !verifyDifference(15, 22, solution) ||
      !verifySum([13, 14, 15, 20, 21, 22], 66, solution)
    ) {
      return;
    } else {
      printSolution(solution);
      return;
    }
  }

  // Recursion
  for (const number of missing) {
    const newSolution = [...solution, number];
    const newMissing = missing.filter((n) => n !== number);
    solveRecursive(newSolution, newMissing);
  }
}

function solve() {
  const missing = [];
  for (let i = 1; i <= 22; i++) {
    missing.push(i);
  }

  solveRecursive([], missing);

  console.log(`${recursiveCallCount} recursive calls`);
}

export function main() {
  solve();
}
