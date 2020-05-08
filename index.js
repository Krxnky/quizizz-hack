class Encoding {
  static encodeRaw(t, e, o = "quizizz.com") {
    let s = 0;
    s = e ? o.charCodeAt(0) : o.charCodeAt(0) + o.charCodeAt(o.length - 1);
    let r = [];
    for (let o = 0; o < t.length; o++) {
      let n = t[o].charCodeAt(0),
        c = e ? this.safeAdd(n, s) : this.addOffset(n, s, o, 2);
      r.push(String.fromCharCode(c));
    }
    return r.join("");
  }

  static decode(t, e = !1) {
    if (e) {
      let e = this.extractHeader(t);
      return this.decodeRaw(e, !0);
    }
    {
      let e = this.decode(this.extractHeader(t), !0),
        o = this.extractData(t);
      return this.decodeRaw(o, !1, e);
    }
  }

  static decodeRaw(t, e, o = "quizizz.com") {
    let s = this.extractVersion(t);
    let r = 0;
    (r = e ? o.charCodeAt(0) : o.charCodeAt(0) + o.charCodeAt(o.length - 1)),
      (r = -r);
    let n = [];
    for (let o = 0; o < t.length; o++) {
      let c = t[o].charCodeAt(0),
        a = e ? this.safeAdd(c, r) : this.addOffset(c, r, o, s);
      n.push(String.fromCharCode(a));
    }
    return n.join("");
  }

  static addOffset(t, e, o, s) {
    return 2 === s
      ? this.verifyCharCode(t)
        ? this.safeAdd(t, o % 2 == 0 ? e : -e)
        : t
      : this.safeAdd(t, o % 2 == 0 ? e : -e);
  }

  static extractData(t) {
    let e = t.charCodeAt(t.length - 2) - 33;
    return t.slice(e, -2);
  }

  static extractHeader(t) {
    let e = t.charCodeAt(t.length - 2) - 33;
    return t.slice(0, e);
  }

  static extractVersion(t) {
    if ("string" == typeof t && t[t.length - 1]) {
      let e = parseInt(t[t.length - 1], 10);
      if (!isNaN(e)) return e;
    }
    return null;
  }

  static safeAdd(t, e) {
    let o = t + e;
    return o > 65535 ? o - 65535 + 0 - 1 : o < 0 ? 65535 - (0 - o) + 1 : o;
  }

  static verifyCharCode(t) {
    if ("number" == typeof t)
      return !((t >= 55296 && t <= 56319) || (t >= 56320 && t <= 57343));
  }
}

function getGameData() {
  let URL = window.location.href,
    GameType = URL.slice(URL.search("gameType=") + 9, URL.length),
    prevConx = localStorage.getItem("previousContext"),
    parsedConx = JSON.parse(prevConx),
    encodedRoomHash = parsedConx.game.roomHash,
    roomHash = Encoding.decode(encodedRoomHash.split("-")[1]),
    data = {
      roomHash: roomHash,
      type: GameType,
    };

  let xhttp = new XMLHttpRequest();
  xhttp.open(
    "POST",
    "https://game.quizizz.com/play-api/v3/getQuestions",
    false
  );
  xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  xhttp.send(JSON.stringify(data));
  return JSON.parse(xhttp.responseText);
}

function getAnswer(Question) {
  switch (Question.structure.kind) {
    case "BLANK":
      // Text Response, we have no need for image detection in answers
      let ToRespond = [];
      for (let i = 0; i < Question.structure.options.length; i++) {
        ToRespond.push(Question.structure.options[i].text);
      }
      return ToRespond;
    case "MSQ":
      // Multiple Choice
      let Answers = Encoding.decode(Question.structure.answer);
      Answers = JSON.parse(Answers);
      let TextArray = [];
      for (let i = 0; i < Answers.length; i++) {
        if (Answers[i].text == "") {
          TextArray.push(Question.structure.options[Answers[i]].media[0].url);
        } else {
          TextArray.push(Question.structure.options[Answers[i]].text);
        }
      }
      return TextArray;
    case "MCQ":
      // Single Choice
      let AnswerNum = Encoding.decode(Question.structure.answer);
      let Answer = Question.structure.options[AnswerNum].text;
      if (Answer == "") {
        Answer = Question.structure.options[AnswerNum].media[0].url;
      }
      return Answer;
  }
}

const listenToQuestionChange = (callback) => {
  let previousQuestion = "0";

  setInterval(() => {
    const currentQuestionElement = document.querySelector(".current-question");
    if (!currentQuestionElement) {
      return;
    }

    const currentQuestion = currentQuestionElement.innerHTML.trim();
    const options = document.querySelectorAll(".option");

    if (currentQuestion === previousQuestion) {
      return;
    } else if (options.length > 0) {
      previousQuestion = currentQuestion;
      callback();
    }
  }, 1000);
};

const normalizeAnswer = (answer) => {
  return answer.trim().replace(/ +/, ' ');
};

const isOptionAnswer = (answer, option) => {
  const html = option.firstChild.firstChild.firstChild.firstChild.innerHTML.trim();

  if (Array.isArray(answer)) {
    return (
      answer.find((answerText) => {
        console.log(normalizeAnswer(answerText), html);
        return normalizeAnswer(answerText) === html;
      }) !== undefined
    );
  }

  return normalizeAnswer(answer) === html;
};

const gameData = getGameData();
const answers = Object.keys(gameData.questions)
  .map((id) => gameData.questions[id])
  .map((question) => getAnswer(question));

listenToQuestionChange(() => {
  const options = document.querySelectorAll(".option");
  options.forEach((option) => {
    if (answers.find((answer) => isOptionAnswer(answer, option))) {
      option.firstChild.firstChild.firstChild.firstChild.innerHTML += `✔`;
    }
  });
});
