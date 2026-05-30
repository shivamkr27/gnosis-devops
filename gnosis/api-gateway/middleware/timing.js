const answerTimingMiddleware = (req, res, next) => {
  // Apply ONLY to POST /content/levels/:levelId/answer
  const answerRouteRegex = /^\/content\/levels\/[^/]+\/answer\/?$/;
  
  if (req.method === 'POST' && answerRouteRegex.test(req.path)) {
    const sentAt = req.headers['x-question-sent-at'];
    const timerSeconds = req.headers['x-timer-seconds'];

    if (!sentAt || !timerSeconds) {
      // If headers missing: let request through
      return next();
    }

    const elapsed = Date.now() - parseInt(sentAt, 10);
    const allowed = parseInt(timerSeconds, 10) * 1000;

    if (elapsed > allowed + 500) {
      return res.status(400).json({ 
        error: "Answer submitted after timer expired" 
      });
    }
  }
  
  next();
};

module.exports = answerTimingMiddleware;
