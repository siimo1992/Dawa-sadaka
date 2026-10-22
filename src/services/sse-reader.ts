/**
 * Utility for parsing Server-Sent Events (SSE) streams in the browser.
 */

export type SSEEventHandler = (event: string, data: any) => void;

export async function readSSE(
  response: Response,
  onEvent: SSEEventHandler
): Promise<void> {
  if (!response.ok || !response.body) {
    throw new Error("تعذّر بدء تدفق البحث.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    buffer += decoder.decode(value || new Uint8Array(), {
      stream: !done
    });
    buffer = buffer.replace(/\r\n/g, "\n");

    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      let eventName = "message";
      const dataLines: string[] = [];

      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length) {
        try {
          onEvent(eventName, JSON.parse(dataLines.join("\n")));
        } catch {
          // تجاهل حدث غير صالح بدل إسقاط الاتصال كله
        }
      }
    }

    if (done) break;
  }
}

export { useSearchStream, phaseLabels } from '../hooks/useSearchStream';

