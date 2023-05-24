async function animateText(line: string, container: HTMLElement) {
    for (let char of line) {
        let span = document.createElement("span");
        span.textContent = char;
        container.appendChild(span);

        // Adjust the delay as needed
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Start the fade out animation
    container.classList.add("fadeout");

    // Remove the text after the fade out
    // Adjust the delay to match the animation duration in the CSS
    await new Promise(resolve => setTimeout(resolve, 2000));
    container.textContent = "";
    container.classList.remove("fadeout");
}

export async function animateLines(lines: string[], container: HTMLElement) {
    for (let line of lines) {
        await animateText(line, container);
    }
}

function createSpan(id: string) {
  let text = document.getElementById(id) as HTMLElement;
  let strText = text.textContent;
  if (strText == null) {
    return;
  }
  let splitText = strText.split("");
  text.textContent = "";

  for (let i = 0; i < splitText.length; i++) {
    let span = document.createElement("span");
    span.className = `${id}`
    span.textContent = splitText[i];
    text.appendChild(span);
  }
}

export function charFlicker(id: string, frequency: number) {
    createSpan(id);
    let chars = document.querySelectorAll<HTMLElement>(`span.${id}`);
    setInterval(function () {
      let randomChar = Math.floor(Math.random() * chars.length);
      chars[randomChar].style.animation = "flicker 1s infinite";
      setTimeout(function () {
        chars[randomChar].style.animation = "none";
      }, 1000);
    }, frequency);
}

