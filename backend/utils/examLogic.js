function shuffleArray(items) {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function selectRandomQuestions(pool, limit = 5) {
  if (!Array.isArray(pool) || pool.length === 0) {
    return [];
  }

  return shuffleArray(pool).slice(0, Math.min(limit, pool.length));
}

function sanitizeQuestions(questions) {
  return questions.map((question) => ({
    _id: question._id,
    questionText: question.questionText,
    options: question.options,
  }));
}

function calculateSubmissionScore(examQuestions, answers = []) {
  const questionMap = new Map(
    examQuestions.map((question, index) => [String(question._id), { ...question, index }])
  );

  let score = 0;

  answers.forEach((answer) => {
    const question = questionMap.get(String(answer.questionId || answer.question_id));
    if (!question) return;

    if (Number(answer.selectedOption) === Number(question.correctOptionIndex)) {
      score += 1;
    }
  });

  return score;
}

module.exports = {
  shuffleArray,
  selectRandomQuestions,
  sanitizeQuestions,
  calculateSubmissionScore,
};
