// Live generation with per-token logit entropy, for the Fork Explorer's "try it" tab.
// The transformers.js module is passed in (`lib`) so the same code runs in the
// browser (CDN import, WebGPU) and in Node (for testing).

export const MODEL_ID = "onnx-community/Qwen3-0.6B-ONNX";

// The exact prompt the article's traces were generated with.
const TEMPLATE = "{question}\n\nSolve this step by step. Write each step on its own line starting with 'Step 1:', 'Step 2:', etc. After the final step, on its own line, write your final numeric answer in exactly this format: '#### <number>' (for example: '#### 42').";
// Requires the newline: while streaming, "#### 2" may still become "#### 291".
const ANSWER_LINE = /####\s*(-?[\d,]*\.?\d+(?:\/\d+)?)[ \t]*\n/;

export function buildPrompt(question) {
  // Qwen3 chat format with thinking disabled (what enable_thinking=False renders).
  return `<|im_start|>user\n${TEMPLATE.replace("{question}", question)}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`;
}

export async function loadModel(lib, { device = "webgpu", dtype = "q4f16", onProgress } = {}) {
  const tokenizer = await lib.AutoTokenizer.from_pretrained(MODEL_ID);
  const model = await lib.AutoModelForCausalLM.from_pretrained(MODEL_ID, { device, dtype, progress_callback: onProgress });
  return { tokenizer, model };
}

const f16 = new Float32Array(1), f16u = new Uint32Array(f16.buffer);
function halfToFloat(h) {
  const s = (h & 0x8000) << 16, e = (h >> 10) & 0x1f, m = h & 0x3ff;
  if (e === 0) return (s ? -1 : 1) * m * 2 ** -24;
  if (e === 31) { f16u[0] = s | 0x7f800000 | (m << 13); return f16[0]; }
  f16u[0] = s | ((e + 112) << 23) | (m << 13);
  return f16[0];
}

// Entropy (bits) and top-k of the next-token distribution, from one row of logits.
export function stats(row, k = 5) {
  const half = row instanceof Uint16Array;
  const V = row.length, x = half ? new Float32Array(V) : row;
  if (half) for (let i = 0; i < V; i++) x[i] = halfToFloat(row[i]);
  let m = -Infinity;
  for (let i = 0; i < V; i++) if (x[i] > m) m = x[i];
  let Z = 0, S = 0;
  const top = [];  // [logit, id], kept sorted descending
  for (let i = 0; i < V; i++) {
    const d = x[i] - m, e = Math.exp(d);
    Z += e; S += e * d;
    if (top.length < k || x[i] > top[top.length - 1][0]) {
      top.push([x[i], i]); top.sort((a, b) => b[0] - a[0]); if (top.length > k) top.pop();
    }
  }
  const H = (Math.log(Z) - S / Z) / Math.LN2;
  return { entropy: Math.max(0, H), top: top.map(([l, id]) => [id, Math.exp(l - m) / Z]) };
}

// Greedy generation (sampling temperature is applied before custom processors in
// transformers.js, which would distort the entropy). Calls onToken({text, entropy, top})
// per generated token; returns the parsed final answer, if any.
export async function generate(lib, { model, tokenizer }, question, { maxNewTokens = 700, onToken, stopper } = {}) {
  const pending = [];
  class EntropyRecorder extends lib.LogitsProcessor {
    _call(input_ids, logits) {
      pending.push(stats(logits[0].data));
      return logits;
    }
  }
  const processors = new lib.LogitsProcessorList();
  processors.push(new EntropyRecorder());

  const ids = [];
  let text = "", sawPrompt = false, answer = null;
  const streamer = {
    put(batch) {
      if (!sawPrompt) { sawPrompt = true; return; }  // first call is the prompt
      const id = Number(batch[0][0]);
      const s = pending.shift();
      ids.push(id);
      const full = tokenizer.decode(ids, { skip_special_tokens: true });
      const piece = full.slice(text.length);  // diffing handles multi-token UTF-8
      text = full;
      onToken?.({
        id, text: piece, entropy: s.entropy,
        top: s.top.map(([tid, p]) => ({ text: tokenizer.decode([tid], { skip_special_tokens: false }), p })),
      });
      const m = text.match(ANSWER_LINE);
      if (m && !answer) { answer = m[1]; stopper?.interrupt(); }
    },
    end() {},
  };
  const inputs = tokenizer(buildPrompt(question), { add_special_tokens: false });
  await model.generate({
    ...inputs, max_new_tokens: maxNewTokens, do_sample: false,
    logits_processor: processors, streamer, stopping_criteria: stopper,
  });
  if (!answer) { const m = text.match(/####\s*(-?[\d,]*\.?\d+)/); if (m) answer = m[1]; }
  return { text, answer };
}
