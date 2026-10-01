'use strict';
/**
 * (AI Generated)
 * Vocabulary question bank. Each choice carries a stable `id` so submissions
 * can reference the picked choice even if labels or order change later.
 * Exactly one choice per question is correct.
 */
const QUESTIONS = [
  {
    question: 'What does "ephemeral" mean?',
    choices: [
      { id: 'a', label: 'Lasting for a very short time', is_correct: true },
      { id: 'b', label: 'Extremely large in size', is_correct: false },
      { id: 'c', label: 'Easily broken', is_correct: false },
      { id: 'd', label: 'Happening every year', is_correct: false },
    ],
  },
  {
    question: 'Choose the synonym of "abundant".',
    choices: [
      { id: 'a', label: 'Scarce', is_correct: false },
      { id: 'b', label: 'Plentiful', is_correct: true },
      { id: 'c', label: 'Hidden', is_correct: false },
      { id: 'd', label: 'Fragile', is_correct: false },
    ],
  },
  {
    question: 'Choose the antonym of "reluctant".',
    choices: [
      { id: 'a', label: 'Hesitant', is_correct: false },
      { id: 'b', label: 'Unwilling', is_correct: false },
      { id: 'c', label: 'Eager', is_correct: true },
      { id: 'd', label: 'Doubtful', is_correct: false },
    ],
  },
  {
    question: 'She was so ___ that she finished the whole project in one night.',
    choices: [
      { id: 'a', label: 'diligent', is_correct: true },
      { id: 'b', label: 'lethargic', is_correct: false },
      { id: 'c', label: 'indifferent', is_correct: false },
      { id: 'd', label: 'careless', is_correct: false },
    ],
  },
  {
    question: 'What does "meticulous" mean?',
    choices: [
      { id: 'a', label: 'Showing great attention to detail', is_correct: true },
      { id: 'b', label: 'Acting without thinking', is_correct: false },
      { id: 'c', label: 'Very fast', is_correct: false },
      { id: 'd', label: 'Easily annoyed', is_correct: false },
    ],
  },
  {
    question: 'Which word best completes the sentence: "The new policy had a ___ effect on sales; they doubled."',
    choices: [
      { id: 'a', label: 'negligible', is_correct: false },
      { id: 'b', label: 'detrimental', is_correct: false },
      { id: 'c', label: 'profound', is_correct: true },
      { id: 'd', label: 'trivial', is_correct: false },
    ],
  },
  {
    question: 'Choose the synonym of "candid".',
    choices: [
      { id: 'a', label: 'Frank', is_correct: true },
      { id: 'b', label: 'Secretive', is_correct: false },
      { id: 'c', label: 'Polite', is_correct: false },
      { id: 'd', label: 'Sweet', is_correct: false },
    ],
  },
  {
    question: 'What does the idiom "break the ice" mean?',
    choices: [
      { id: 'a', label: 'To damage something valuable', is_correct: false },
      { id: 'b', label: 'To make people feel more relaxed in a social situation', is_correct: true },
      { id: 'c', label: 'To end a relationship', is_correct: false },
      { id: 'd', label: 'To start winter activities', is_correct: false },
    ],
  },
  {
    question: 'Choose the antonym of "obscure".',
    choices: [
      { id: 'a', label: 'Vague', is_correct: false },
      { id: 'b', label: 'Hidden', is_correct: false },
      { id: 'c', label: 'Unknown', is_correct: false },
      { id: 'd', label: 'Evident', is_correct: true },
    ],
  },
  {
    question: 'He gave a ___ answer, so nobody knew what he really meant.',
    choices: [
      { id: 'a', label: 'concise', is_correct: false },
      { id: 'b', label: 'ambiguous', is_correct: true },
      { id: 'c', label: 'precise', is_correct: false },
      { id: 'd', label: 'explicit', is_correct: false },
    ],
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    const now = new Date();

    // bulkInsert has no attribute types, so JSON must be serialized explicitly;
    // a raw JS array would be sent as a Postgres array literal instead.
    await queryInterface.bulkInsert('quiz_question', QUESTIONS.map((q) => ({
      question: q.question,
      choices: JSON.stringify(q.choices),
      created_at: now,
      updated_at: now,
    })));
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('quiz_question', {
      question: { [Sequelize.Op.in]: QUESTIONS.map((q) => q.question) },
    });
  },
};
