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

// MARK: Errors

class LinearProgramError extends Error {}

class LinearProgramSizeError extends LinearProgramError {}

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

  public formatToSimplex() {
    // TODO
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

    return program;
  }
}

export const privateExports = {
  isObjectiveType,
  isRestrictionType,
  isConstraintType,
};
