import { readdirSync, readFileSync, writeFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { LinearProgram, privateExports } from "./program";

describe("LinearProgram", () => {
  describe("ObjectiveType", () => {
    describe("isObjectiveType", () => {
      it('should return true for "maximize"', () => {
        expect(privateExports.isObjectiveType("maximize")).toBe(true);
      });

      it('should return true for "minimize"', () => {
        expect(privateExports.isObjectiveType("minimize")).toBe(true);
      });

      it('should return false for "other"', () => {
        expect(privateExports.isObjectiveType("other")).toBe(false);
      });
    });
  });

  describe("RestrictionType", () => {
    describe("isRestrictionType", () => {
      it('should return true for "non-negative"', () => {
        expect(privateExports.isRestrictionType("non-negative")).toBe(true);
      });

      it('should return true for "unrestricted"', () => {
        expect(privateExports.isRestrictionType("unrestricted")).toBe(true);
      });

      it('should return false for "other"', () => {
        expect(privateExports.isRestrictionType("other")).toBe(false);
      });
    });
  });

  describe("ConstraintType", () => {
    describe("isConstraintType", () => {
      it('should return true for "="', () => {
        expect(privateExports.isConstraintType("=")).toBe(true);
      });

      it('should return true for ">="', () => {
        expect(privateExports.isConstraintType(">=")).toBe(true);
      });

      it('should return true for "<="', () => {
        expect(privateExports.isConstraintType("<=")).toBe(true);
      });

      it('should return false for "other"', () => {
        expect(privateExports.isConstraintType("other")).toBe(false);
      });
    });
  });

  describe("LinearProgram", () => {
    describe("addVariable", () => {
      describe("when the constraint coefficients do not match the number of constraints", () => {
        it("should throw an error", () => {
          const program = new LinearProgram("maximize");

          expect(() => {
            program.addVariable(1, [1, 2], "non-negative");
          }).toThrowError(
            "Cannot add variable with 2 constraints to program with 0 constraints",
          );
        });
      });

      describe("when the program is in standard form", () => {
        describe("and the restriction is non-negative", () => {
          it("should leave the program in standard form", () => {
            const program = new LinearProgram("maximize");

            program.standardize();
            program.addVariable(1, [], "non-negative");

            expect(program["isStandardForm"]).toBe(true);
          });
        });

        describe("and the restriction is unrestricted", () => {
          it("should not leave the program in standard form", () => {
            const program = new LinearProgram("maximize");

            program.standardize();
            program.addVariable(1, [], "unrestricted");

            expect(program["isStandardForm"]).toBe(false);
          });
        });
      });

      describe("when the program has no constraints", () => {
        it("should add the variable to the program", () => {
          const program = new LinearProgram("maximize");

          program.addVariable(1, [], "non-negative");

          expect(program["coefficients"]).toEqual([1]);
          expect(program["restrictions"]).toEqual(["non-negative"]);
          expect(program["n"]).toEqual(1);

          program.addVariable(2, [], "non-negative");

          expect(program["coefficients"]).toEqual([1, 2]);
          expect(program["restrictions"]).toEqual([
            "non-negative",
            "non-negative",
          ]);
          expect(program["n"]).toEqual(2);
        });
      });

      describe("when the program has constraints", () => {
        it("should add the variable to the program", () => {
          const program = new LinearProgram("maximize");

          program.addConstraint("=", 1, []);
          program.addConstraint("=", 2, []);

          program.addVariable(1, [1, 2], "non-negative");
          program.addVariable(2, [3, 4], "unrestricted");

          expect(program["coefficients"]).toEqual([1, 2]);
          expect(program["restrictions"]).toEqual([
            "non-negative",
            "unrestricted",
          ]);
          expect(program["n"]).toEqual(2);
          expect(program["m"]).toEqual(2);
          expect(program["constraints"]).toEqual([
            { type: "=", value: 1, coefficients: [1, 3] },
            { type: "=", value: 2, coefficients: [2, 4] },
          ]);
        });
      });
    });

    describe("addConstraint", () => {
      describe("when the coefficients do not match the number of variables", () => {
        it("should throw an error", () => {
          const program = new LinearProgram("maximize");

          expect(() => {
            program.addConstraint("=", 1, [1, 2]);
          }).toThrowError(
            "Cannot add constraint with 2 variables to program with 0 variables",
          );
        });
      });

      describe("when the program is in standard form", () => {
        describe("and the constraint is an equality", () => {
          it("should leave the program in standard form", () => {
            const program = new LinearProgram("maximize");

            program.standardize();
            program.addConstraint("=", 1, []);

            expect(program["isStandardForm"]).toBe(true);
          });
        });

        describe("and the constraint is an inequality", () => {
          it("should not leave the program in standard form", () => {
            const program = new LinearProgram("maximize");

            program.standardize();
            program.addConstraint("<=", 1, []);

            expect(program["isStandardForm"]).toBe(false);
          });
        });
      });

      describe("when the program has no variables", () => {
        it("should add the constraint to the program", () => {
          const program = new LinearProgram("maximize");

          program.addConstraint("=", 1, []);

          expect(program["constraints"]).toEqual([
            { type: "=", value: 1, coefficients: [] },
          ]);
          expect(program["m"]).toEqual(1);

          program.addConstraint("=", 2, []);

          expect(program["constraints"]).toEqual([
            { type: "=", value: 1, coefficients: [] },
            { type: "=", value: 2, coefficients: [] },
          ]);
          expect(program["m"]).toEqual(2);
        });
      });

      describe("when the program has variables", () => {
        it("should add the constraint to the program", () => {
          const program = new LinearProgram("maximize");

          program.addVariable(1, [], "non-negative");
          program.addVariable(2, [], "non-negative");

          program.addConstraint("=", 1, [1, 2]);

          expect(program["constraints"]).toEqual([
            { type: "=", value: 1, coefficients: [1, 2] },
          ]);
          expect(program["m"]).toEqual(1);

          program.addConstraint("=", 2, [1, 2]);

          expect(program["constraints"]).toEqual([
            { type: "=", value: 1, coefficients: [1, 2] },
            { type: "=", value: 2, coefficients: [1, 2] },
          ]);
          expect(program["m"]).toEqual(2);
        });
      });
    });

    describe("standardize", () => {
      it("should convert the program to standard form", () => {
        const testDataDirectory = __dirname + "/../data/test/standard-form/";

        const files = readdirSync(testDataDirectory);

        const filePairs: Record<
          string,
          {
            isStandardForm: boolean;
            content: string;
          }[]
        > = {};

        for (const file of files) {
          const content = readFileSync(testDataDirectory + file, "utf-8");

          const id = file.split("_")[0];
          const isStandardForm =
            file.replace(".json", "").split("_")[1] === "standard";

          expect(id).toBeDefined();

          if (!id) {
            continue;
          }

          let pair = filePairs[id];

          if (!pair) {
            pair = [];
            filePairs[id] = pair;
          }

          pair.push({
            isStandardForm,
            content,
          });
        }

        for (const pair of Object.values(filePairs)) {
          expect(pair.length).toBe(2);

          const nonStandard = pair.find((pair) => !pair.isStandardForm);
          const standard = pair.find((pair) => pair.isStandardForm);

          expect(nonStandard).toBeDefined();
          expect(standard).toBeDefined();

          if (!nonStandard || !standard) {
            continue;
          }

          const nonStandardProgram = LinearProgram.deserialize(
            nonStandard.content,
          );
          const standardProgram = LinearProgram.deserialize(standard.content);

          nonStandardProgram.standardize();

          const serializedNonStandardProgram = nonStandardProgram.serialize();
          const serializedStandardProgram = standardProgram.serialize();

          expect(serializedNonStandardProgram).toBe(serializedStandardProgram);
        }
      });
    });

    describe("temporary", () => {
      it("temporary", () => {
        const testDataDirectory = __dirname + "/../data/test/simplex-form/";

        const testInputFile = readFileSync(
          testDataDirectory + "test.json",
          "utf-8",
        );

        const program = LinearProgram.deserialize(testInputFile);

        program["pivot"](1, 1);

        const serializedProgram = program.serialize();

        writeFileSync(
          testDataDirectory + "result.json",
          serializedProgram,
          "utf-8",
        );

        program["pivot"](2, 3);

        const serializedProgram2 = program.serialize();

        writeFileSync(
          testDataDirectory + "result2.json",
          serializedProgram2,
          "utf-8",
        );
      });

      it("temporary", () => {
        const testDataDirectory = __dirname + "/../data/test/simplex-form/";

        const testInputFile = readFileSync(
          testDataDirectory + "test-solve.json",
          "utf-8",
        );

        const program = LinearProgram.deserialize(testInputFile);

        program["isStandardForm"] = true;
        program["isSimplexForm"] = true;

        const solution = program["solveSimplexRecursive"](new Set([0, 1, 2]));

        writeFileSync(
          testDataDirectory + "result-solve.json",
          JSON.stringify(solution),
          "utf-8",
        );
        writeFileSync(
          testDataDirectory + "result-solve-program.json",
          program.serialize(),
          "utf-8",
        );
      });

      it("temporary", () => {
        const testDataDirectory = __dirname + "/../data/test/simplex-form/";

        const testInputFile = readFileSync(
          testDataDirectory + "test-solve.json",
          "utf-8",
        );

        const program = LinearProgram.deserialize(testInputFile);

        const solution = program.solveSimplex();

        console.log(solution);

        writeFileSync(
          testDataDirectory + "result-solve-auto.json",
          JSON.stringify(
            typeof solution !== "string" ? Array.from(solution) : solution,
          ),
          "utf-8",
        );
        writeFileSync(
          testDataDirectory + "result-solve-auto-program.json",
          program.serialize(),
          "utf-8",
        );

        const testInputFile2 = readFileSync(
          testDataDirectory + "test-solve-2.json",
          "utf-8",
        );

        const program2 = LinearProgram.deserialize(testInputFile2);

        const testInputFile3 = readFileSync(
          testDataDirectory + "test-solve-3.json",
          "utf-8",
        );

        const program3 = LinearProgram.deserialize(testInputFile3);

        program2["isStandardForm"] = true;
        program2["isSimplexForm"] = true;

        program2["solveSimplexRecursive"](new Set([2]));

        const program2Copy = LinearProgram.deserialize(testInputFile2);

        program2Copy.solveSimplex();

        program3.solveSimplex();

        writeFileSync(
          testDataDirectory + "result-solve-2-auto.json",
          program2.serialize(),
          "utf-8",
        );

        writeFileSync(
          testDataDirectory + "result-solve-3-auto.json",
          program3.serialize(),
          "utf-8",
        );

        writeFileSync(
          testDataDirectory + "result-solve-2-auto-program.json",
          program2Copy.serialize(),
          "utf-8",
        );
      });
    });
  });
});
