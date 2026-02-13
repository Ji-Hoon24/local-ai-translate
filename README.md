# Local AI Translate

로컬 AI 모델(Ollama, LM Studio, vLLM 등)을 활용한 번역 크롬 익스텐션.
웹페이지에서 텍스트를 선택하면 실시간 스트리밍으로 번역 결과를 보여줍니다.

## 설치

### 1. 로컬 AI 서버 준비

아래 중 하나를 설치하고 실행합니다.

**Ollama (가장 간단)**
```bash
# 설치: https://ollama.com
ollama pull gemma3:4b        # 원하는 모델 다운로드
ollama serve                  # 기본 포트 11434에서 실행
```

**LM Studio**
```
1. https://lmstudio.ai 에서 설치
2. 모델 다운로드
3. Local Server 탭 → Start Server (기본 포트 1234)
```

**vLLM**
```bash
pip install vllm
vllm serve <model-name> --port 8000
```

### 2. 크롬 익스텐션 설치

```
1. chrome://extensions 접속
2. 우측 상단 "개발자 모드(Developer mode)" 활성화
3. "압축해제된 확장 프로그램을 로드합니다(Load unpacked)" 클릭
4. 이 폴더(local-ai-translate)를 선택
```

## 설정

크롬 우측 상단의 익스텐션 아이콘을 클릭하면 설정 팝업이 열립니다.

| 항목 | 설명 | 예시 |
|------|------|------|
| **API Base URL** | AI 서버 주소 | `http://localhost:11434` (Ollama) |
| **Model** | 사용할 모델 | Fetch 버튼으로 목록 불러오기 |
| **Target Language** | 번역 대상 언어 | Korean, English, Japanese 등 |
| **Custom System Prompt** | 번역 프롬프트 커스터마이징 (선택) | 비워두면 기본 프롬프트 사용 |

### 설정 순서

1. **API Base URL** 입력 → **Test** 버튼으로 연결 확인
2. **Fetch** 버튼 → 모델 목록에서 원하는 모델 선택
3. **Target Language** 선택
4. **Save Settings** 클릭

### 서버별 기본 URL

| 서버 | URL |
|------|-----|
| Ollama | `http://localhost:11434` |
| LM Studio | `http://localhost:1234` |
| vLLM | `http://localhost:8000` |

## 사용법

1. 아무 웹페이지에서 **텍스트를 드래그하여 선택**
2. 선택 영역 근처에 파란색 **번역 아이콘** 등장
3. 아이콘 클릭 → **번역 팝업**이 열리고 실시간 스트리밍으로 결과 표시
4. **Copy** 버튼으로 번역 결과 복사
5. **ESC** 또는 다른 곳 클릭으로 팝업 닫기

## 원격 서버 사용

localhost가 아닌 원격 서버를 사용할 경우, URL 입력 시 크롬이 추가 권한을 요청합니다. 허용하면 정상 동작합니다.

## 문제 해결

| 증상 | 해결 |
|------|------|
| Test 실패 | AI 서버가 실행 중인지, URL과 포트가 맞는지 확인 |
| Fetch 시 모델 없음 | 서버에 모델이 다운로드되어 있는지 확인 (예: `ollama pull gemma3:4b`) |
| 번역 아이콘 안 나옴 | 익스텐션 설치 후 페이지를 새로고침 |
| "No model configured" | 설정에서 모델을 선택하고 Save |
| 번역이 느림 | 더 작은 모델 사용 또는 GPU 가속 확인 |
