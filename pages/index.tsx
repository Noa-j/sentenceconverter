import { useState, useRef } from 'react';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  let requestTimes: number[] = [];
  const canRequest = () => {
    const now = Date.now();
    requestTimes = requestTimes.filter(t => now - t < 60000);
    if (requestTimes.length >= 5) return false;
    requestTimes.push(now);
    return true;
  };

  const convertWithAI = async (text: string) => {
    const prompt = `다음 문장을 개조식으로 변환해주세요. 변환 과정에서 맞춤법과 띄어쓰기도 함께 교정해주세요.

원문: "${text}"

변환 규칙:
1. 적절한 수준으로 간결하면서도 의미가 명확하게 변환
2. 문장 끝을 명사형으로 (~함, ~임, ~됨, ~음 등)
3. 불필요한 수식어와 조사 제거
4. 핵심 내용만 간결하게 정리
5. 여러 내용이 있으면 • 또는 번호로 구분
6. 전문용어는 그대로 유지
7. 맞춤법과 띄어쓰기 교정 적용`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: "당신은 한국어 문장을 개조식으로 간결하게 바꾸는 전문가입니다." },
            { role: "user", content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('API 호출 오류:', error);
      throw new Error('AI 변환 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleConvert = async () => {
    if (!inputText.trim()) return;
    if (!canRequest()) {
      setError("요청이 너무 많습니다. 1분 후 다시 시도해주세요.");
      return;
    }

    setIsConverting(true);
    setError('');

    try {
      const result = await convertWithAI(inputText);
      setOutputText(result);
    } catch (err) {
      setError(err.message);
      setOutputText('');
    } finally {
      setIsConverting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setError('');
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>🧠 AI 개조식 문장 변환기</h1>
      <textarea
        ref={textareaRef}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="변환할 문장을 입력하세요..."
        style={{ width: '100%', height: '140px', padding: '1rem', marginBottom: '1rem' }}
      />
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={handleClear} style={{ marginRight: '1rem' }}>초기화</button>
        <button onClick={handleConvert} disabled={!inputText.trim() || isConverting}>
          {isConverting ? '변환 중...' : 'AI 변환'}
        </button>
      </div>
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      <textarea
        value={outputText}
        readOnly
        style={{ width: '100%', height: '140px', padding: '1rem', backgroundColor: '#f0f0f0' }}
        placeholder="AI 변환 결과가 여기에 표시됩니다"
      />
      {outputText && (
        <button onClick={handleCopy} style={{ marginTop: '0.5rem' }}>
          {copied ? '복사됨!' : '결과 복사'}
        </button>
      )}
    </div>
  );
}