import body from "../../../config/body.json";

export const getQuestionFromGemini = async (userData, config) => {
  const apiKey = process.env.API_KEY as string;
  if (config.envrionment === "local") {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(
        `API responded with status ${response.status}: ${errorDetails}`,
      );
    }

    const questionData = await response.json();
    const data = JSON.parse(questionData.body);
    return data;
  } else {
    const response = await fetch(config.apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(
        `API responded with status ${response.status}: ${errorDetails}`,
      );
    }

    const questionData = await response.json();
    return questionData;
  }
};
