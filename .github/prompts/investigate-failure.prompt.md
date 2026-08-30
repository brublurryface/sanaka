---
name: investigate-failure
description: Diagnose a failing test or build without changing code
argument-hint: 'describe or paste the failing test/build output'
agent: agent
---

Investigate the failure described in the current conversation.

Do not change code yet.

1. Read the exact failure output.
2. Read the relevant production and test files.
3. Determine which category best explains the failure:
   - production bug
   - incorrect test expectation
   - environment/configuration problem
   - insufficient evidence
4. Compare the observed behavior with the intended product behavior.
5. Do not change production code merely to satisfy an incorrect test.
6. Do not change a test merely because production code currently behaves differently.
7. Report the evidence supporting the diagnosis.

Finish with exactly one recommendation:

- FIX PRODUCTION CODE
- FIX TEST EXPECTATION
- FIX CONFIGURATION
- MORE INFORMATION NEEDED

Do not edit files unless explicitly requested afterward.
