const test = require('node:test');
const assert = require('node:assert/strict');
const {
  selectRandomQuestions,
  sanitizeQuestions,
  calculateSubmissionScore,
} = require('../utils/examLogic.js');

test('selectRandomQuestions returns up to five items from a pool', () => {
  const pool = Array.from({ length: 20 }, (_, index) => ({ _id: `${index + 1}` }));
  const selected = selectRandomQuestions(pool, 5);

  assert.equal(selected.length, 5);
  assert.ok(selected.every((question) => pool.some((item) => item._id === question._id)));
});

test('sanitizeQuestions strips correct answers before sending to clients', () => {
  const questions = [
    {
      _id: 'q1',
      questionText: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctOptionIndex: 1,
    },
  ];

  const sanitized = sanitizeQuestions(questions);

  assert.deepEqual(sanitized, [{
    _id: 'q1',
    questionText: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
  }]);
});

test('calculateSubmissionScore validates selected answers against correct option', () => {
  const examQuestions = [
    {
      _id: 'q1',
      questionText: '2 + 2',
      options: ['3', '4', '5', '6'],
      correctOptionIndex: 1,
    },
    {
      _id: 'q2',
      questionText: '3 + 3',
      options: ['5', '6', '7', '8'],
      correctOptionIndex: 2,
    },
  ];

  const score = calculateSubmissionScore(examQuestions, [
    { questionId: 'q1', selectedOption: 1 },
    { questionId: 'q2', selectedOption: 1 },
  ]);

  assert.equal(score, 1);
});
