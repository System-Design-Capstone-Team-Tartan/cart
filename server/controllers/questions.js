const models = require('../models');

module.exports = {
  get: (req, res) => {
    let {
      product_id: productId, count = 5, page = 1,
    } = req.query;
    count = Number(count);
    page = Number(page);
    productId = productId.toString();
    if (count % 1 !== 0 || count <= 0) {
      res.status(400).json({ status: 'Error', msg: 'count must be whole number greater than 0' });
    } else if (page % 1 !== 0 || page <= 0) {
      res.status(400).json({ status: 'Error', msg: 'page must be whole number greater than 0' });
    } else {
      models.questions.query(productId, count, page)
        .then((response) => {
          const { rows: questionsArray } = response;
          if (!questionsArray || questionsArray.length < 1) {
            res.status(400).json({ status: 'Error', msg: 'No results' });
          } else {
            const queryAnswers = questionsArray.map((question) => models.answers.query(
              question.question_id,
            ));
            // TODO: Possible optimization: JOINING on question_id might be faster
            Promise.all(queryAnswers)
              .then((queryAnswersResponseArray) => {
                // Map the answersResponseArray into questionsArray as
                // a new property 'answers that's an object
                // with key=answer_id and all properties contained
                const results = questionsArray.map((question, idx) => {
                  const answersObj = queryAnswersResponseArray[idx].rows.reduce(
                    (obj, answer) => {
                      const ans = answer;
                      ans.id = answer.answer_id;
                      delete ans.answer_id;
                      return Object.assign(obj, { [ans.id]: ans });
                    },
                    {},
                  );
                  const q = question;
                  q.answers = answersObj;
                  return q;
                });
                res.status(200).json({
                  status: 'OK',
                  data: {
                    product_id: productId,
                    results,
                  },
                });
              });
          }
        })
        .catch((err) => {
          console.error('Internal database error fetching answers\n', err);
          res.status(500).json({ msg: 'Internal database error fetching questions\n' });
        });
    }
  },
  post: (req, res) => {
    const {
      product_id: productId, body, name, email,
    } = req.body;
    if (!body || typeof body !== 'string' || body.length > 1000) {
      res.status(400).json({ status: 'Error', msg: 'answer body must be string <= 1000 chars in length' });
    } else if (!name || typeof name !== 'string' || name.length > 60) {
      res.status(400).json({ status: 'Error', msg: 'name must be string <= 60 chars in length' });
    } else if (!productId || typeof productId !== 'number' || productId <= 0 || productId % 1 !== 0) {
      res.status(400).json({ status: 'Error', msg: 'product_id must be an integer' });
    } else if (!email || typeof email !== 'string' || email.length > 60) {
      // TODO: use regex for e-mail verification
      res.status(400).json({ status: 'Error', msg: 'email must be string <= 60 chars in length' });
    } else {
      models.questions.insert(productId, body, name, email)
        .then((response) => {
          res.status(201).json({ status: 'CREATED' });
          // TODO: handle duplicate entry gracefully
        })
        .catch((err) => {
          console.error('Internal database error posting answer\n', err);
          res.status(500).json({ msg: 'Internal database error posting answer\n' });
        });
    }
  },
  putHelpful: (req, res) => {
    res.status(204).json({ status: 'NO CONTENT' });
  },
  putReport: (req, res) => {
    res.status(204).json({ status: 'NO CONTENT' });
  },
};
