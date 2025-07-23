(async function(codioIDE, window) {
  const coachAPI = codioIDE.coachBot;

  // === Register the Main Menu Button ===
  coachAPI.register("explainError", "🧯 Explain an error", explainError);

  // === Error Explanation ===
  async function explainError(params) {
    // collects all available context
    const context = await coachAPI.getContext();
    console.log(`context -> `, context)

    // collects all available student code
    const code = context.files?.[0].content || "No source code content available.";
    console.log(`code content -> `, code)

    // collects all error information
    let input;
    if (params === "tooltip") {
      input = context.error.text;
      coachAPI.write(input, coachAPI.MESSAGE_ROLES.USER);
    } else {
      try {
        input = await coachAPI.input("Please paste the error message you want me to explain!");
      } catch (e) {
        if (e.message === "Cancelled") {
          coachAPI.write("Feel free to ask me to explain other errors!");
          coachAPI.showMenu();
          return;
        }
      }
    }

    const validationPrompt = `<Instructions>
Please determine whether the following text appears to be a programming error message or not:
<text>
${input}
</text>
Output your final Yes or No answer in JSON format with the key 'answer'.
</Instructions>`;

    const validation = await coachAPI.ask({
      systemPrompt: "You are a helpful assistant.",
      userPrompt: validationPrompt
    }, { stream: false, preventMenu: true });

    if (validation.result.includes("Yes")) {
      const systemPrompt = `You will be given a programming error message. Your task is to explain in plain, non-technical English what is causing the error, without suggesting any potential fixes or solutions.
If provided with the student's Java code, please carefully review it before explaining the error message.
Include common misconceptions. Use markdown formatting for code.`;

      const userPrompt = `Here is the error message:
<error_message>
${input}
</error_message>

Here is the student's Java code:
<code>
${JSON.stringify(code)}
</code>
Phrase your explanation directly addressing the student as 'you'.`;

      await coachAPI.ask({
        systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      });
    } else {
      coachAPI.write("This doesn't appear to be a recognizable error message.");
      coachAPI.showMenu();
    }
  }

  // === Tooltip-triggered error help ===
  codioIDE.onErrorState((isError, error) => {
    if (isError) {
      coachAPI.showTooltip("I can help explain this error...", () => {
        coachAPI.open({ id: "customErrorTooltip", params: "tooltip" });
      });
    }
  });

})(window.codioIDE, window);