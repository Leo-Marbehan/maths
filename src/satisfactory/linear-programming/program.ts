// MARK: Types

const OBJECTIVE_TYPES = ["minimize", "maximize"] as const;
type ObjectiveType = (typeof OBJECTIVE_TYPES)[number];

function isObjectiveType(value: string): value is ObjectiveType {
  return OBJECTIVE_TYPES.includes(value as ObjectiveType);
}

const CONSTRAINT_TYPES = ["=", "<=", ">="] as const;
type ConstraintType = (typeof CONSTRAINT_TYPES)[number];

function isConstraintType(value: string): value is ConstraintType {
  return CONSTRAINT_TYPES.includes(value as ConstraintType);
}

const RESTRICTION_TYPES = ["non-negative", "unrestricted"] as const;
type RestrictionType = (typeof RESTRICTION_TYPES)[number];

function isRestrictionType(value: string): value is RestrictionType {
  return RESTRICTION_TYPES.includes(value as RestrictionType);
}

interface Constraint {
  /**
   * The type of the constraint
   */
  type: ConstraintType;

  /**
   * The value of the constraint
   */
  value: number;

  /**
   * The coefficients of the variables in the constraint
   *
   * Should always be of length n
   */
  coefficients: number[];
}

interface LinearProgramSnapshot {
  objectiveType: ObjectiveType;
  n: number;
  coefficients: number[];
  constant: number;
  m: number;
  constraints: Constraint[];
  restrictions: RestrictionType[];
  isStandardForm: boolean;
  isSimplexForm: boolean;
}

// MARK: Errors

class LinearProgramError extends Error {}

class LinearProgramSizeError extends LinearProgramError {}

class LinearProgramSolutionError extends LinearProgramError {}

class LinearProgramDeserializationError extends LinearProgramError {
  constructor(
    message: string,
    public readonly data: string,
    public readonly parsedData: unknown,
  ) {
    super(message);
  }
}

// MARK: Program

export class LinearProgram {
  /**
   * The objective type
   */
  private objectiveType: ObjectiveType;

  /**
   * The number of variables
   */
  private n: number = 0;

  /**
   * The coefficients of the variables
   *
   * Should always be of length n
   */
  private coefficients: number[] = [];

  /**
   * The constant
   */
  private _constant: number = 0;

  /**
   * The number of constraints
   */
  private m: number = 0;

  /**
   * The constraints
   *
   * Should always be of length m
   */
  private constraints: Constraint[] = [];

  /**
   * The restrictions
   *
   * Should always be of length n
   */
  private restrictions: RestrictionType[] = [];

  /**
   * Whether the program is in standard form
   */
  private isStandardForm: boolean = false;

  /**
   * Whether the program is in simplex form
   */
  private isSimplexForm: boolean = false;

  constructor(objectiveType: ObjectiveType) {
    this.objectiveType = objectiveType;
  }

  // MARK: Setters

  set constant(value: number) {
    this._constant = value;
  }

  // MARK: Add Variable

  /**
   * Add a variable to the program
   *
   * @param coefficient The coefficient of the variable in the objective
   * @param constraintCoefficients The coefficients of the variable in the constraints
   * @param restriction The restriction of the variable
   */
  public addVariable(
    coefficient: number,
    constraintCoefficients: number[],
    restriction: RestrictionType,
  ) {
    // We keep standard form if all restrictions are non-negative
    this.isStandardForm = this.isStandardForm && restriction === "non-negative";
    this.isSimplexForm = false;

    if (constraintCoefficients.length !== this.m) {
      throw new LinearProgramSizeError(
        `Cannot add variable with ${constraintCoefficients.length} constraints to program with ${this.m} constraints`,
      );
    }

    ++this.n;

    this.coefficients.push(coefficient);
    this.restrictions.push(restriction);

    for (let i = 0; i < this.m; i++) {
      const constraint = this.constraints[i];
      const constraintCoefficient = constraintCoefficients[i];

      if (constraint === undefined) {
        throw new LinearProgramSizeError(
          `Constraint at index ${i} is undefined in program with ${this.m} constraints`,
        );
      }

      if (constraintCoefficient === undefined) {
        throw new LinearProgramSizeError(
          `Constraint coefficient at index ${i} is undefined in program with ${this.m} constraints`,
        );
      }

      constraint.coefficients.push(constraintCoefficient);
    }
  }

  // MARK: Add Constraint

  /**
   * Add a constraint to the program
   *
   * @param type
   * @param value
   * @param coefficients
   */
  public addConstraint(
    type: ConstraintType,
    value: number,
    coefficients: number[],
  ) {
    // We keep standard form if all constraints are equalities
    this.isStandardForm = this.isStandardForm && type === "=";
    this.isSimplexForm = false;

    if (coefficients.length !== this.n) {
      throw new LinearProgramSizeError(
        `Cannot add constraint with ${coefficients.length} variables to program with ${this.n} variables`,
      );
    }

    ++this.m;

    this.constraints.push({ type, value, coefficients });
  }

  // MARK: Standardize

  /**
   * Standardize the program
   */
  public standardize() {
    if (this.isStandardForm) {
      return;
    }

    // Convert objective to maximize
    if (this.objectiveType === "minimize") {
      this.objectiveType = "maximize";
      this.coefficients = this.coefficients.map((c) => -c);
      this._constant = -this._constant;
    }

    // Convert all constraints to equalities
    for (let i = 0; i < this.m; i++) {
      const constraint = this.constraints[i];

      if (constraint === undefined) {
        throw new LinearProgramSizeError(
          `Constraint at index ${i} is undefined in program with ${this.m} constraints`,
        );
      }

      if (constraint.type === ">=") {
        constraint.type = "<=";
        constraint.value = -constraint.value;
        constraint.coefficients = constraint.coefficients.map((c) => -c);
      }

      if (constraint.type === "<=") {
        constraint.type = "=";

        const variableConstraintCoefficients: number[] = [];

        for (let j = 0; j < this.m; j++) {
          variableConstraintCoefficients.push(i === j ? 1 : 0);
        }

        this.addVariable(0, variableConstraintCoefficients, "non-negative");
      }
    }

    // Restrict all variables to non-negative
    for (let i = 0; i < this.n; i++) {
      const coefficient = this.coefficients[i];
      const restriction = this.restrictions[i];

      if (coefficient === undefined) {
        throw new LinearProgramSizeError(
          `Coefficient at index ${i} is undefined in program with ${this.n} variables`,
        );
      }

      if (restriction === undefined) {
        throw new LinearProgramSizeError(
          `Restriction at index ${i} is undefined in program with ${this.n} variables`,
        );
      }

      if (restriction === "non-negative") {
        continue;
      }

      this.restrictions[i] = "non-negative";

      const variableConstraintCoefficients: number[] = [];

      for (const constraint of this.constraints) {
        const constraintCoefficient = constraint.coefficients[i];

        if (constraintCoefficient === undefined) {
          throw new LinearProgramSizeError(
            `Constraint coefficient at index ${i} is undefined in program with ${this.n} variables`,
          );
        }

        variableConstraintCoefficients.push(-constraintCoefficient);
      }

      this.addVariable(
        -coefficient,
        variableConstraintCoefficients,
        "non-negative",
      );
    }

    this.isStandardForm = true;
    this.isSimplexForm = false;
  }

  // MARK: Without Changes
  public withoutChanges<T>(callback: () => T): T {
    const snapshot = this.getSnapshot();

    try {
      return callback();
    } finally {
      this.applySnapshot(snapshot);
    }
  }

  // MARK: Simplex
  public solveSimplex(): Set<number> | "unbounded" | "infeasible" {
    this.standardize();

    const standardForm = this.getSnapshot();

    this.formatToIntermediateSimplex();

    const numberOfAddedVariables = this.m;
    const numberOfOriginalVariables = this.n - numberOfAddedVariables;

    /**
     * Indexes of the basic feasible solution, i.e. the indexes of the
     * variables that are equal to 0
     */
    const zeroVariables = new Set<number>();

    for (let i = 0; i < numberOfOriginalVariables; i++) {
      zeroVariables.add(i);
    }

    const intermediateZeroVariables = this.solveSimplexRecursive(zeroVariables);

    if (
      intermediateZeroVariables === "unbounded" ||
      intermediateZeroVariables === "infeasible"
    ) {
      return intermediateZeroVariables;
    }

    const intermediateObjective =
      this._constant +
      this.coefficients.reduce((acc, c, i) => {
        if (intermediateZeroVariables.has(i)) {
          return acc;
        }

        return acc + c;
      }, 0);

    if (intermediateObjective < 0) {
      return "infeasible";
    }

    const constraintsToRemove = new Set<number>();
    const variablesToRemove = new Set<number>();

    for (let i = numberOfOriginalVariables; i < this.n; i++) {
      if (!intermediateZeroVariables.has(i)) {
        const baseIndex = this.constraints.findIndex((constraint) => {
          const coefficient = constraint.coefficients[i];

          if (coefficient === undefined) {
            throw new LinearProgramSizeError(
              `Constraint coefficient at index ${i} is undefined in program with ${this.n} variables`,
            );
          }

          return coefficient === 1;
        });

        if (baseIndex === -1) {
          throw new LinearProgramSolutionError(
            "Non zero variable is not a basic variable",
          );
        }

        const constraint = this.constraints[baseIndex];

        if (constraint === undefined) {
          throw new LinearProgramSizeError(
            `Constraint at index ${baseIndex} is undefined in program with ${this.m} constraints`,
          );
        }

        const pivotVariableIndex = constraint.coefficients.findIndex(
          (c, i) => i < numberOfOriginalVariables && c !== 0,
        );

        if (pivotVariableIndex === -1) {
          constraintsToRemove.add(baseIndex);
          variablesToRemove.add(i);
        } else {
          this.pivot(baseIndex, pivotVariableIndex);
          if (!intermediateZeroVariables.delete(pivotVariableIndex)) {
            throw new LinearProgramSolutionError(
              "Pivot variable is not a zero variable",
            );
          }

          if (intermediateZeroVariables.has(i)) {
            throw new LinearProgramSolutionError(
              "Leaving variable is a zero variable",
            );
          }

          intermediateZeroVariables.add(i);
        }
      }
    }

    for (const constraintIndex of Array.from(constraintsToRemove)
      .sort()
      .reverse()) {
      this.constraints.splice(constraintIndex, 1);
    }

    for (const variableIndex of Array.from(variablesToRemove)
      .sort()
      .reverse()) {
      this.coefficients.splice(variableIndex, 1);
      this.restrictions.splice(variableIndex, 1);
      this.constraints.forEach((constraint) => {
        constraint.coefficients.splice(variableIndex, 1);
      });
    }

    this.n -= variablesToRemove.size;
    this.m -= constraintsToRemove.size;

    const basis: number[] = [];

    for (
      let constraintIndex = 0;
      constraintIndex < numberOfAddedVariables;
      constraintIndex++
    ) {
      const constraint = this.constraints[constraintIndex];

      if (constraint === undefined) {
        throw new LinearProgramSizeError(
          `Constraint at index ${constraintIndex} is undefined in program with ${this.m} constraints`,
        );
      }

      const basisIndex = constraint.coefficients.findIndex(
        (c, coefficientIndex) => {
          if (c !== 1 || intermediateZeroVariables.has(coefficientIndex)) {
            return false;
          }

          if (coefficientIndex >= numberOfOriginalVariables) {
            throw new LinearProgramSolutionError(
              "Basis variable is an intermediate variable",
            );
          }

          return this.constraints.every(
            (c, currentConstraintIndex) =>
              c.coefficients[coefficientIndex] === 0 ||
              currentConstraintIndex === constraintIndex,
          );
        },
      );

      if (basisIndex === -1) {
        console.log(intermediateZeroVariables);
        console.log(this.serialize());
        throw new LinearProgramSolutionError(
          "No basis variable found for constraint",
        );
      }

      basis.push(basisIndex);
    }

    const basisSet = new Set(basis);

    // Restore the original form
    for (let i = numberOfOriginalVariables; i < this.n; i++) {
      intermediateZeroVariables.delete(i);
    }

    this.coefficients = this.coefficients.slice(0, numberOfOriginalVariables);
    this.restrictions = this.restrictions.slice(0, numberOfOriginalVariables);

    // Use basis to restore the objective coefficients and constant
    this.coefficients = this.coefficients.map((c, i) => {
      if (basisSet.has(i)) {
        return 0;
      }

      const originalCoefficient = standardForm.coefficients[i];

      if (originalCoefficient === undefined) {
        throw new LinearProgramSizeError(
          `Original coefficient at index ${i} is undefined in program with ${this.n} variables`,
        );
      }

      const newCoefficient =
        originalCoefficient +
        this.constraints.reduce((acc, constraint, constraintIndex) => {
          const coefficient = constraint.coefficients[i];

          if (coefficient === undefined) {
            throw new LinearProgramSizeError(
              `Constraint coefficient at index ${i} is undefined in program with ${this.n} variables`,
            );
          }

          const basisIndex = basis[constraintIndex];

          if (basisIndex === undefined) {
            throw new LinearProgramSizeError(
              `Basis index at index ${constraintIndex} is undefined in program with ${this.m} constraints`,
            );
          }

          const basisCoefficient = standardForm.coefficients[basisIndex];

          if (basisCoefficient === undefined) {
            throw new LinearProgramSizeError(
              `Basis coefficient at index ${basisIndex} is undefined in program with ${this.n} variables`,
            );
          }

          return acc + coefficient * basisCoefficient;
        }, 0);

      return newCoefficient;
    });

    this.constant = this.constraints.reduce(
      (acc, constraint, constraintIndex) => {
        const basisIndex = basis[constraintIndex];

        if (basisIndex === undefined) {
          throw new LinearProgramSizeError(
            `Basis index at index ${constraintIndex} is undefined in program with ${this.m} constraints`,
          );
        }

        const basisCoefficient = standardForm.coefficients[basisIndex];

        if (basisCoefficient === undefined) {
          throw new LinearProgramSizeError(
            `Basis coefficient at index ${basisIndex} is undefined in program with ${this.n} variables`,
          );
        }

        return acc + constraint.value * basisCoefficient;
      },
      0,
    );

    this.constraints.forEach((constraint) => {
      constraint.coefficients = constraint.coefficients.slice(
        0,
        numberOfOriginalVariables,
      );
    });

    this.n = numberOfOriginalVariables;
    this.isStandardForm = true;
    this.isSimplexForm = true;

    console.log(this.serialize(), "->", intermediateZeroVariables);

    return this.solveSimplexRecursive(intermediateZeroVariables);
  }

  private solveSimplexRecursive(
    zeroVariables: Set<number>,
  ): Set<number> | "unbounded" | "infeasible" {
    if (!this.isSimplexForm) {
      throw new LinearProgramSolutionError("Program is not in simplex form");
    }

    // Bland's rule
    // s
    const firstPositiveCoefficientIndex = this.coefficients.findIndex(
      (c) => c > 0,
    );

    if (firstPositiveCoefficientIndex === -1) {
      // Optimal solution found
      return zeroVariables;
    }

    // Bland's rule
    // r
    let smallestRatio = Number.MAX_SAFE_INTEGER;
    let smallestRatioIndex = -1;
    let smallestRatioContraint: Constraint | undefined;

    for (let i = 0; i < this.m; i++) {
      const constraint = this.constraints[i];

      if (constraint === undefined) {
        throw new LinearProgramSizeError(
          `Constraint at index ${i} is undefined in program with ${this.m} constraints`,
        );
      }

      const coefficient =
        constraint.coefficients[firstPositiveCoefficientIndex];

      if (coefficient === undefined) {
        throw new LinearProgramSizeError(
          `Constraint coefficient at index ${firstPositiveCoefficientIndex} is undefined in program with ${this.m} constraints`,
        );
      }

      if (coefficient <= 0) {
        continue;
      }

      const ratio = constraint.value / coefficient;

      if (ratio < smallestRatio) {
        smallestRatio = ratio;
        smallestRatioIndex = i;
        smallestRatioContraint = constraint;
      }
    }

    if (smallestRatioIndex === -1) {
      return "unbounded";
    }

    if (smallestRatioContraint === undefined) {
      throw new LinearProgramSolutionError(
        "Smallest ratio constraint is undefined",
      );
    }

    const leavingVariableIndexes: number[] = [];

    for (let i = 0; i < this.n; i++) {
      const coefficient = this.coefficients[i];

      if (coefficient === undefined) {
        throw new LinearProgramSizeError(
          `Coefficient at index ${i} is undefined in program with ${this.n} variables`,
        );
      }

      if (coefficient !== 0) {
        continue;
      }

      if (zeroVariables.has(i)) {
        throw new LinearProgramSolutionError(
          "Zero variable cannot have zero coefficient",
        );
      }

      const constraintCoefficient = smallestRatioContraint.coefficients[i];

      if (constraintCoefficient === undefined) {
        throw new LinearProgramSizeError(
          `Constraint coefficient at index ${i} is undefined in program with ${this.m} constraints`,
        );
      }

      // console.log(`i: ${i}`);
      // console.log(`coefficient: ${coefficient}`);
      // console.log(`constraintCoefficient: ${constraintCoefficient}`);
      // console.log(
      //   `smallestRatioContraint.coefficients: ${smallestRatioContraint.coefficients.toString()}`,
      // );

      if (
        constraintCoefficient !== 0 &&
        this.constraints.every((c, j) => {
          const coefficient = c.coefficients[i];

          if (coefficient === undefined) {
            throw new LinearProgramSizeError(
              `Constraint coefficient at index ${i} is undefined in program with ${this.m} constraints`,
            );
          }

          return (
            coefficient === 0 || (j === smallestRatioIndex && coefficient === 1)
          );
        })
      ) {
        leavingVariableIndexes.push(i);
      }
    }

    // console.log("before pivot");
    // console.log(
    //   `firstPositiveCoefficientIndex: ${firstPositiveCoefficientIndex}`,
    // );
    // console.log(`smallestRatioIndex: ${smallestRatioIndex}`);
    // console.log(`leavingVariableIndexes: ${leavingVariableIndexes.toString()}`);
    // console.log(this.serialize());

    if (leavingVariableIndexes.length === 0) {
      throw new LinearProgramSolutionError("No leaving variable found");
    }

    if (leavingVariableIndexes.length > 1) {
      throw new LinearProgramSolutionError("Multiple leaving variables found");
    }

    const leavingVariableIndex = leavingVariableIndexes[0];

    if (leavingVariableIndex === undefined) {
      throw new LinearProgramSolutionError(
        "Leaving variable index is undefined",
      );
    }

    this.pivot(smallestRatioIndex, firstPositiveCoefficientIndex);

    if (!zeroVariables.delete(firstPositiveCoefficientIndex)) {
      throw new LinearProgramSolutionError("Pivot column is not zero variable");
    }
    if (zeroVariables.has(leavingVariableIndex)) {
      throw new LinearProgramSolutionError("Leaving variable is zero variable");
    }
    zeroVariables.add(leavingVariableIndex);

    console.log(`smallestRatioIndex: ${smallestRatioIndex}`);
    console.log(
      `firstPositiveCoefficientIndex: ${firstPositiveCoefficientIndex}`,
    );
    console.log(`leavingVariableIndex: ${leavingVariableIndex}`);
    console.log(zeroVariables);
    console.log(this.coefficients);
    this.constraints.forEach((c) => {
      console.log(
        c.coefficients.map((c) => c.toString().padStart(5)),
        c.value,
      );
    });

    return this.solveSimplexRecursive(zeroVariables);
  }

  /**
   *
   * @param constraintIndex r
   * @param variableIndex s
   */
  private pivot(constraintIndex: number, variableIndex: number) {
    const snapshot = this.getSnapshot();

    const constraint = snapshot.constraints[constraintIndex];

    if (constraint === undefined) {
      throw new LinearProgramSizeError(
        `Constraint at index ${constraintIndex} is undefined in program with ${this.m} constraints`,
      );
    }

    // ars
    const pivotVariablePivotConstraintCoefficient =
      constraint.coefficients[variableIndex];

    if (pivotVariablePivotConstraintCoefficient === undefined) {
      throw new LinearProgramSizeError(
        `Constraint coefficient at index ${variableIndex} is undefined in program with ${this.n} variables`,
      );
    }

    // cs
    const pivotVariableCoefficient = snapshot.coefficients[variableIndex];

    if (pivotVariableCoefficient === undefined) {
      throw new LinearProgramSizeError(
        `Coefficient at index ${variableIndex} is undefined in program with ${this.n} variables`,
      );
    }

    // br
    const pivotConstraintValue = constraint.value;

    // Constant
    // c = c + (cs * br) / ars
    this._constant +=
      (pivotVariableCoefficient * pivotConstraintValue) /
      pivotVariablePivotConstraintCoefficient;

    // Coefficients
    for (let j = 0; j < this.n; j++) {
      // arj
      const currentVariablePivotConstraintCoefficient =
        constraint.coefficients[j];

      if (currentVariablePivotConstraintCoefficient === undefined) {
        throw new LinearProgramSizeError(
          `Constraint coefficient at index ${j} is undefined in program with ${this.n} variables`,
        );
      }

      // cj
      const currentVariableCoefficient = snapshot.coefficients[j];

      if (currentVariableCoefficient === undefined) {
        throw new LinearProgramSizeError(
          `Coefficient at index ${j} is undefined in program with ${this.n} variables`,
        );
      }

      // cj = cj - (arj * cs) / ars
      this.coefficients[j] =
        currentVariableCoefficient -
        (currentVariablePivotConstraintCoefficient * pivotVariableCoefficient) /
          pivotVariablePivotConstraintCoefficient;
    }

    // Constraint values
    for (let i = 0; i < this.m; i++) {
      const currentConstraint = this.constraints[i];

      if (currentConstraint === undefined) {
        throw new LinearProgramSizeError(
          `Constraint at index ${i} is undefined in program with ${this.m} constraints`,
        );
      }

      const snapshotConstraint = snapshot.constraints[i];

      if (snapshotConstraint === undefined) {
        throw new LinearProgramSizeError(
          `Constraint at index ${i} is undefined in program with ${this.m} constraints`,
        );
      }

      // ais
      const pivotVariableCurrentConstraintCoefficient =
        snapshotConstraint.coefficients[variableIndex];

      if (pivotVariableCurrentConstraintCoefficient === undefined) {
        throw new LinearProgramSizeError(
          `Constraint coefficient at index ${variableIndex} is undefined in program with ${this.n} variables`,
        );
      }

      // bi
      const currentConstraintValue = snapshotConstraint.value;

      if (i === constraintIndex) {
        // i = r
        // bi = br / ars
        currentConstraint.value =
          pivotConstraintValue / pivotVariablePivotConstraintCoefficient;
      } else {
        // bi = bi - (ais * br) / ars
        currentConstraint.value =
          currentConstraintValue -
          (pivotVariableCurrentConstraintCoefficient * pivotConstraintValue) /
            pivotVariablePivotConstraintCoefficient;
      }
    }

    // Constraints
    for (let j = 0; j < this.n; j++) {
      // arj
      const currentVariablePivotConstraintCoefficient =
        constraint.coefficients[j];

      if (currentVariablePivotConstraintCoefficient === undefined) {
        throw new LinearProgramSizeError(
          `Constraint coefficient at index ${j} is undefined in program with ${this.n} variables`,
        );
      }

      for (let i = 0; i < this.m; i++) {
        const currentConstraint = this.constraints[i];

        if (currentConstraint === undefined) {
          throw new LinearProgramSizeError(
            `Constraint at index ${i} is undefined in program with ${this.m} constraints`,
          );
        }

        const snapshotConstraint = snapshot.constraints[i];

        if (snapshotConstraint === undefined) {
          throw new LinearProgramSizeError(
            `Constraint at index ${i} is undefined in program with ${this.m} constraints`,
          );
        }

        // aij
        const currentConstraintCoefficient = snapshotConstraint.coefficients[j];

        if (currentConstraintCoefficient === undefined) {
          throw new LinearProgramSizeError(
            `Constraint coefficient at index ${j} is undefined in program with ${this.n} variables`,
          );
        }

        // ais
        const pivotVariableCurrentConstraintCoefficient =
          snapshotConstraint.coefficients[variableIndex];

        if (pivotVariableCurrentConstraintCoefficient === undefined) {
          throw new LinearProgramSizeError(
            `Constraint coefficient at index ${variableIndex} is undefined in program with ${this.n} variables`,
          );
        }

        if (i === constraintIndex) {
          // arj = arj / ars
          currentConstraint.coefficients[j] =
            currentConstraintCoefficient /
            pivotVariablePivotConstraintCoefficient;
        } else {
          // aij = aij - (arj * ais) / ars
          currentConstraint.coefficients[j] =
            currentConstraintCoefficient -
            (currentVariablePivotConstraintCoefficient *
              pivotVariableCurrentConstraintCoefficient) /
              pivotVariablePivotConstraintCoefficient;
        }
      }
    }
  }

  /**
   * Format the program to the intermediate simplex form
   *
   * @returns A snapshot of the standard form
   */
  private formatToIntermediateSimplex() {
    if (this.isSimplexForm) {
      return;
    }

    this.standardize();

    // Make all equality values positive
    for (const constraint of this.constraints) {
      if (constraint.value < 0) {
        constraint.coefficients = constraint.coefficients.map((c) => -c);
        constraint.value = -constraint.value;
      }
    }

    // New objective
    //   -eT * b + (eT * A) * x

    // -eT * b
    this._constant = -this.constraints
      .map((c) => c.value)
      .reduce((a, b) => a + b, 0);

    // (eT * A) * x
    this.coefficients = this.constraints.reduce<number[]>((c, constraint) => {
      if (c.length === 0) {
        return constraint.coefficients;
      }

      return c.map((c, i) => {
        if (constraint.coefficients[i] === undefined) {
          throw new LinearProgramSizeError(
            `Constraint coefficient at index ${i} is undefined in program with ${this.n} variables`,
          );
        }

        return (
          c +
          (constraint.coefficients[i] < 0
            ? -constraint.coefficients[i]
            : constraint.coefficients[i])
        );
      });
    }, []);

    // New constraints
    //   A * x + I * xa = b
    for (let i = 0; i < this.m; i++) {
      const coefficients = [];

      for (let j = 0; j < this.m; j++) {
        if (j === i) {
          coefficients.push(1);
        } else {
          coefficients.push(0);
        }
      }

      this.addVariable(0, coefficients, "non-negative");
    }

    this.isSimplexForm = true;
  }

  // MARK: Snapshots

  /**
   * @returns A deep copy of the current state
   */
  private getSnapshot(): LinearProgramSnapshot {
    return {
      n: this.n,
      m: this.m,
      objectiveType: this.objectiveType,
      constant: this._constant,
      coefficients: this.coefficients.slice(),
      restrictions: this.restrictions.slice(),
      constraints: this.constraints.map((c) => ({
        type: c.type,
        value: c.value,
        coefficients: c.coefficients.slice(),
      })),
      isStandardForm: this.isStandardForm,
      isSimplexForm: this.isSimplexForm,
    };
  }

  /**
   * Restore the program from a snapshot
   *
   * @param snapshot
   */
  private applySnapshot(snapshot: LinearProgramSnapshot) {
    this.n = snapshot.n;
    this.m = snapshot.m;
    this.objectiveType = snapshot.objectiveType;
    this._constant = snapshot.constant;
    this.coefficients = snapshot.coefficients;
    this.restrictions = snapshot.restrictions;
    this.constraints = snapshot.constraints;
    this.isStandardForm = snapshot.isStandardForm;
    this.isSimplexForm = snapshot.isSimplexForm;
  }

  static fromSnapshot(snapshot: LinearProgramSnapshot): LinearProgram {
    const program = new LinearProgram(snapshot.objectiveType);
    program.applySnapshot(snapshot);
    return program;
  }

  // MARK: Serialize

  public serialize(): string {
    const data = {
      objectiveType: this.objectiveType,
      coefficients: this.coefficients,
      restrictions: this.restrictions,
      constraints: this.constraints,
      constant: this._constant,
    };

    return JSON.stringify(data, null, 2);
  }

  // MARK: Deserialize

  static deserialize(data: string): LinearProgram {
    const parsedData: unknown = JSON.parse(data);

    if (typeof parsedData !== "object") {
      throw new LinearProgramDeserializationError(
        "Data is not an object",
        data,
        parsedData,
      );
    }

    if (parsedData === null) {
      throw new LinearProgramDeserializationError(
        "Data is null",
        data,
        parsedData,
      );
    }

    if (!("objectiveType" in parsedData)) {
      throw new LinearProgramDeserializationError(
        "Missing objective type",
        data,
        parsedData,
      );
    }

    if (!("coefficients" in parsedData)) {
      throw new LinearProgramDeserializationError(
        "Missing coefficients",
        data,
        parsedData,
      );
    }

    if (!("restrictions" in parsedData)) {
      throw new LinearProgramDeserializationError(
        "Missing restrictions",
        data,
        parsedData,
      );
    }

    if (!("constraints" in parsedData)) {
      throw new LinearProgramDeserializationError(
        "Missing constraints",
        data,
        parsedData,
      );
    }

    if (!("constant" in parsedData)) {
      throw new LinearProgramDeserializationError(
        "Missing constant",
        data,
        parsedData,
      );
    }

    if (typeof parsedData.objectiveType !== "string") {
      throw new LinearProgramDeserializationError(
        "Objective type is not a string",
        data,
        parsedData,
      );
    }

    if (!isObjectiveType(parsedData.objectiveType)) {
      throw new LinearProgramDeserializationError(
        "Invalid objective type",
        data,
        parsedData,
      );
    }

    if (!Array.isArray(parsedData.coefficients)) {
      throw new LinearProgramDeserializationError(
        "Coefficients is not an array",
        data,
        parsedData,
      );
    }

    if (
      !parsedData.coefficients.every(
        (coefficient) => typeof coefficient === "number",
      )
    ) {
      throw new LinearProgramDeserializationError(
        "Some coefficients are not numbers",
        data,
        parsedData,
      );
    }

    if (!Array.isArray(parsedData.restrictions)) {
      throw new LinearProgramDeserializationError(
        "Restrictions is not an array",
        data,
        parsedData,
      );
    }

    if (
      !parsedData.restrictions.every(
        (restriction) => typeof restriction === "string",
      )
    ) {
      throw new LinearProgramDeserializationError(
        "Some restrictions are not strings",
        data,
        parsedData,
      );
    }

    if (!parsedData.restrictions.every(isRestrictionType)) {
      throw new LinearProgramDeserializationError(
        "Some restrictions are not valid",
        data,
        parsedData,
      );
    }

    if (!Array.isArray(parsedData.constraints)) {
      throw new LinearProgramDeserializationError(
        "Constraints is not an array",
        data,
        parsedData,
      );
    }

    const constraints: Constraint[] = [];

    for (let i = 0; i < parsedData.constraints.length; i++) {
      const constraint: unknown = parsedData.constraints[i];

      if (typeof constraint !== "object") {
        throw new LinearProgramDeserializationError(
          `Constraint at index ${i} is not an object`,
          data,
          parsedData,
        );
      }

      if (constraint === null) {
        throw new LinearProgramDeserializationError(
          `Constraint at index ${i} is null`,
          data,
          parsedData,
        );
      }

      if (!("type" in constraint)) {
        throw new LinearProgramDeserializationError(
          `Missing type in constraint at index ${i}`,
          data,
          parsedData,
        );
      }

      if (typeof constraint.type !== "string") {
        throw new LinearProgramDeserializationError(
          `Type in constraint at index ${i} is not a string`,
          data,
          parsedData,
        );
      }

      if (!isConstraintType(constraint.type)) {
        throw new LinearProgramDeserializationError(
          `Invalid type in constraint at index ${i}`,
          data,
          parsedData,
        );
      }

      if (!("value" in constraint)) {
        throw new LinearProgramDeserializationError(
          `Missing value in constraint at index ${i}`,
          data,
          parsedData,
        );
      }

      if (typeof constraint.value !== "number") {
        throw new LinearProgramDeserializationError(
          `Value in constraint at index ${i} is not a number`,
          data,
          parsedData,
        );
      }

      if (!("coefficients" in constraint)) {
        throw new LinearProgramDeserializationError(
          `Missing coefficients in constraint at index ${i}`,
          data,
          parsedData,
        );
      }

      if (!Array.isArray(constraint.coefficients)) {
        throw new LinearProgramDeserializationError(
          `Coefficients in constraint at index ${i} is not an array`,
          data,
          parsedData,
        );
      }

      if (
        !constraint.coefficients.every(
          (coefficient) => typeof coefficient === "number",
        )
      ) {
        throw new LinearProgramDeserializationError(
          `Some coefficients in constraint at index ${i} are not numbers`,
          data,
          parsedData,
        );
      }

      constraints.push({
        type: constraint.type,
        value: constraint.value,
        coefficients: constraint.coefficients,
      });
    }

    if (typeof parsedData.constant !== "number") {
      throw new LinearProgramDeserializationError(
        "Constant is not a number",
        data,
        parsedData,
      );
    }

    if (parsedData.coefficients.length !== parsedData.restrictions.length) {
      throw new LinearProgramDeserializationError(
        "Coefficients and restrictions have different lengths",
        data,
        parsedData,
      );
    }

    for (let i = 0; i < constraints.length; i++) {
      const constraint = constraints[i];

      if (constraint === undefined) {
        throw new LinearProgramDeserializationError(
          `Constraint at index ${i} is undefined`,
          data,
          parsedData,
        );
      }

      if (constraint.coefficients.length !== parsedData.coefficients.length) {
        throw new LinearProgramDeserializationError(
          `Constraint at index ${i} has different number of coefficients`,
          data,
          parsedData,
        );
      }
    }

    const program = new LinearProgram(parsedData.objectiveType);

    for (let i = 0; i < parsedData.coefficients.length; i++) {
      const coefficient = parsedData.coefficients[i];
      const restriction = parsedData.restrictions[i];

      if (coefficient === undefined) {
        throw new LinearProgramDeserializationError(
          `Coefficient at index ${i} is undefined`,
          data,
          parsedData,
        );
      }

      if (restriction === undefined) {
        throw new LinearProgramDeserializationError(
          `Restriction at index ${i} is undefined`,
          data,
          parsedData,
        );
      }

      program.addVariable(coefficient, [], restriction);
    }

    for (let i = 0; i < constraints.length; i++) {
      const constraint = constraints[i];

      if (constraint === undefined) {
        throw new LinearProgramDeserializationError(
          `Constraint at index ${i} is undefined`,
          data,
          parsedData,
        );
      }

      program.addConstraint(
        constraint.type,
        constraint.value,
        constraint.coefficients,
      );
    }

    program.constant = parsedData.constant;

    return program;
  }
}

// MARK: Exports
export const privateExports = {
  isObjectiveType,
  isRestrictionType,
  isConstraintType,
};
