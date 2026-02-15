> [<- 허브로 돌아가기](../상품이미지_AI기술_조사보고서_2025_02.md)

# 이미지 처리: 배경 제거 + 업스케일링/리터칭

**작성일**: 2025년 2월 8일 | **원본**: 상품 이미지 특화 AI 기술 현황 조사 보고서

---

## 1. 배경 제거/교체 API

### 핵심 결론
**Remove.bg와 Photoroom API가 프로덕션 레벨 시장을 양분**하고 있으며, **SAM 2 (Meta)**는 오픈소스 대안으로 자유도가 높지만 상용 통합 복잡도가 있습니다. 2025년 기준 모든 솔루션이 성숙한 상태입니다.

### 상세 비교표

| 기술명 | API 가용성 | 가격 | 품질 | 성숙도 | 특징 | 한국 접근성 |
|--------|-----------|------|------|--------|------|------------|
| **Remove.bg** | REST API | $0.20/이미지<br/>구독 $9/월~ | 매우높음 | 프로덕션 | 인물/제품 최적화 | O |
| **Photoroom API** | REST API | $29/월 (500장)<br/>$99/월 (2000장) | 매우높음 | 프로덕션 | 자동 배경 생성 | O |
| **ClipDrop API** | REST API | $9/월 (1500장)<br/>API 종량제 | 높음 | 프로덕션 | Stability AI 기반 | O |
| **SAM 2 (Meta)** | OSS (PyTorch) | 무료 (Apache 2.0) | 높음 | 베타 | 비디오 세그먼트 지원 | O |
| **Claid.ai** | REST API | $19/월~ | 높음 | 프로덕션 | 배경+리터칭 통합 | O |

### 1.1 Remove.bg
**공식**: https://www.remove.bg/api

**특징**:
- 업계 표준 (5억+ 이미지 처리)
- 인물 전용 모델 + 상품 전용 모델 분리
- 자동 품질 향상 (에지 다듬기, 그림자 보존)

**API 스펙**:
```bash
curl -X POST https://api.remove.bg/v1.0/removebg \
  -H 'X-Api-Key: YOUR_API_KEY' \
  -F 'image_file=@product.jpg' \
  -F 'size=auto'
```

**가격** (2025년 2월):
- 무료: 50 API 호출 (1 MP)
- Subscription: $9/월 (40장) ~ $249/월 (1500장)
- Pay-as-you-go: $0.20/장 (대량 할인 가능)

**성능**:
- 처리 속도: 평균 1-3초/이미지
- 정확도: IoU ~0.92 (일반 제품)
- 지원 포맷: JPG, PNG (최대 12 MP)

**제약**:
- 복잡한 투명 객체(유리, 플라스틱) 한계
- 배경 생성 기능 없음 (제거만)

---

### 1.2 Photoroom API
**공식**: https://www.photoroom.com/api

**특징**:
- 배경 제거 + **자동 배경 생성** (AI 기반)
- 그림자/반사 자동 추가
- 배치 처리 최적화

**API 예시**:
```javascript
const response = await fetch('https://sdk.photoroom.com/v1/segment', {
  method: 'POST',
  headers: {
    'x-api-key': 'YOUR_KEY',
  },
  body: formData
});
```

**가격**:
- API Pro: $29/월 (500 크레딧)
- Business: $99/월 (2000 크레딧)
- Enterprise: 커스텀

**성능**:
- 속도: 1-2초/이미지
- 품질: Remove.bg와 유사 (IoU ~0.90)
- 추가 기능: 자동 크롭, 배경 확장

**장점**:
- 배경 생성 프롬프트 지원 ("white studio background")
- 그림자/반사 자동 추가로 자연스러운 합성

---

### 1.3 Segment Anything Model 2 (SAM 2, Meta)
**공식**: https://github.com/facebookresearch/segment-anything-2

**특징**:
- **비디오 세그먼트** 지원 (프레임 간 일관성)
- Point/Box/Mask 입력 모두 지원
- 오픈소스 (Apache 2.0)

**설치**:
```bash
pip install SAM-2
# 모델 다운로드 (3.6GB)
```

**사용 예시**:
```python
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

predictor = SAM2ImagePredictor(build_sam2(...))
predictor.set_image(image)
masks, _, _ = predictor.predict(<input_prompts>)
```

**장점**:
- 무료, 상업용 가능
- 커스터마이징 가능 (파인튜닝)
- 멀티 객체 동시 세그먼트

**단점**:
- API 형태 없음 (직접 서빙 필요)
- GPU 필수 (VRAM 8GB+)
- 후처리 직접 구현 필요

**성능**:
- 정확도: IoU ~0.88 (일반), ~0.93 (고품질 프롬프트)
- 속도: RTX 4090 기준 ~0.5초/이미지

---

### 1.4 ClipDrop API (Stability AI)
**공식**: https://clipdrop.co/apis

**특징**:
- Stability AI 기반 (Stable Diffusion 연계)
- 배경 제거 + 인페인팅 + 업스케일 통합 API

**API 예시**:
```bash
curl -X POST https://clipdrop-api.co/remove-background/v1 \
  -H 'x-api-key: YOUR_KEY' \
  -F 'image_file=@product.jpg'
```

**가격**:
- Starter: $9/월 (1500 API calls)
- Pro: $29/월 (5000 calls)
- Enterprise: 커스텀

**장점**:
- 다양한 AI 기능 통합 (배경 제거, 교체, 업스케일)
- Stability AI 생태계 활용

---

### 근거 링크 및 버전 정보
- Remove.bg API Docs: https://www.remove.bg/api (v1.0, 2024년 12월 업데이트)
- Photoroom API: https://www.photoroom.com/api (v1, 2024년 11월)
- SAM 2 GitHub: https://github.com/facebookresearch/segment-anything-2 (v1.0, 2024년 7월 릴리즈)
- ClipDrop API: https://clipdrop.co/apis (v1, 2024년 10월)

---

## 5. 이미지 업스케일링/리터칭

### 핵심 결론
**이미지 업스케일링 시장은 오픈소스 Real-ESRGAN과 프리미엄 Topaz Gigapixel로 양분**됩니다. **Topaz**는 최고 품질($299 일회), **Real-ESRGAN**은 무료이지만 품질 제한적, **Magnific AI**는 생성형 업스케일링으로 차별화되었으나 비용이 높습니다.

### 상세 비교표

| 기술명 | 오픈소스 | API | 가격 | 품질 | 최대배율 | 자동보정 | 노이즈제거 | 상품이미지 |
|--------|---------|-----|------|------|---------|--------|----------|---------|
| **Real-ESRGAN** | O | O | 무료 | 중상 | 4x | X | △ | △ |
| **Topaz Gigapixel** | X | X | $299 (영구) | 매우높음 | 6x | O | O | O |
| **Magnific AI** | X | O | $25~30/월 | 높음 | 16x | X | X | △ |
| **SUPIR** | O | X | 무료 | 높음 | 4x | △ | △ | △ |
| **Upscayl** | O | X | 무료 | 중상 | 4x | X | △ | △ |

### 5.1 Real-ESRGAN
**공식**: https://github.com/xinntao/Real-ESRGAN

**특징**:
- **Real Super-Resolution GAN**
- 오픈소스 (Apache 2.0)
- 여러 사전학습 모델 (일반, 얼굴, 애니메이션)

**설치**:
```bash
pip install realesrgan

# 사용
realesrgan-ncnn-vulkan -i input.jpg -o output.jpg -s 4
```

**Python API**:
```python
from basicsr.archs.rrdbnet_arch import RRDBNet
from realesrgan import RealESRGANer

model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32)
upsampler = RealESRGANer(
    scale=4,
    model_path='RealESRGAN_x4plus.pth',
    model=model
)
output, _ = upsampler.enhance(img)
```

**성능**:
- 속도: RTX 3090 기준 ~0.1-0.3초/이미지
- 품질: PSNR ~26dB, SSIM ~0.73
- 메모리: 2GB VRAM

**장점**:
- 무료, 상업용 가능
- GPU/CPU 모두 지원
- 경량 모델

**한계**:
- 고급 리터칭 부족
- 6배 이상 배율 품질 하락

---

### 5.2 Topaz Gigapixel AI
**공식**: https://www.topazlabs.com/gigapixel-ai

**특징**:
- AI 기반 **전문가용 업스케일링**
- Photoshop/Lightroom 플러그인
- 배치 처리 지원

**가격** (2025년 2월):
- 영구 라이선스: $299 (일회)
- 구독형: $13/월 (Creative Cloud)

**성능**:
- 최대 6배 배율
- 품질: PSNR ~28dB+, SSIM ~0.82
- 속도: RTX 4090 기준 ~2초/이미지

**리터칭 기능**:
- 자동 노이즈 제거
- 선명도 조정
- 색감 보정
- 결점 제거

**장점**:
- 최고 품질 (상업용 표준)
- 배치 처리 자동화
- 사진/일러스트 모두 우수

**한계**:
- API 없음 (데스크톱 앱 전용)
- 높은 가격

---

### 5.3 Magnific AI
**공식**: https://magnific.ai/

**특징**:
- **생성형 업스케일링** (디테일 추가)
- 창의적 이미지 향상

**가격**:
- 크레딧: $25 (100 크레딧, ~4-5장)
- 구독: $30/월 (300 크레딧)

**성능**:
- 최대 16배 배율 (생성형)
- 품질: 높음 (창작적)
- 속도: ~30초/이미지

**장점**:
- 초고배율 지원
- 일러스트/미술 최적

**한계**:
- 원본 손상 위험 (생성형 특성)
- 상품 이미지 부적합 (정확도 우선 시)

---

### 5.4 SUPIR (Scaled-Up Perception)
**GitHub**: https://github.com/Fangyi-Chen/SUPIR

**특징**:
- 대규모 모델 기반
- Real-ESRGAN보다 우수

**성능**:
- 품질: PSNR ~27dB
- 속도: ~1초/이미지 (RTX 4090)

**한계**:
- 연구용 (프로덕션 통합 복잡)
- 문서 부족

---

### 5.5 Upscayl (Real-ESRGAN 기반 UI)
**GitHub**: https://github.com/upscayl/upscayl

**특징**:
- Real-ESRGAN 기반 데스크톱 앱
- 사용자 친화적 UI

**가격**: 무료

**장점**:
- 초보자 추천
- 드래그 앤 드롭

---

### 리터칭 기능 비교

| 기능 | Real-ESRGAN | Topaz | Magnific | SUPIR |
|------|------------|-------|---------|-------|
| **노이즈 제거** | 기본 | 고급 | △ | O |
| **선명도** | X | 자동 | X | △ |
| **색감 보정** | X | O | X | X |
| **톤매핑** | X | O | X | X |
| **결점 제거** | X | O | X | X |
| **배치처리** | △ 수동 | O | O | △ |

---

### 상품 이미지 추천 순위

1. **Topaz Gigapixel AI** (최고)
   - 이유: 전문가용 품질, 배치 처리
   - 추천: 중규모 이상 프로젝트

2. **Real-ESRGAN + 수동 보정**
   - 이유: 무료, API 자동화 가능
   - 추천: 소규모 또는 예산 제한

3. **Magnific AI** (비추천)
   - 이유: 생성형 -> 원본 손상 위험

---

### 다음 액션

#### 1단계: 도구 선택 (1주)
- 소규모 (1-100장): Real-ESRGAN 또는 Topaz 체험판
- 중규모 (100-1000장): Real-ESRGAN 자동화 또는 Topaz
- 대규모 (1000+장): Topaz 배치 또는 Real-ESRGAN API

#### 2단계: 환경 구성
```bash
# Real-ESRGAN 설치
pip install realesrgan

# 또는 Upscayl 다운로드 (GUI)
# https://github.com/upscayl/upscayl/releases
```

#### 3단계: 테스트
- 대표 상품 이미지 5장으로 각 도구 비교
- PSNR/SSIM 메트릭 수집
- 색감, 텍스트 보존 평가

#### 4단계: 통합
- 자동화: Python 스크립트 (Real-ESRGAN)
- 플러그인: Photoshop (Topaz)
- API: Magnific (필요시)

---

### 근거 링크
- Real-ESRGAN: https://github.com/xinntao/Real-ESRGAN (2024년 업데이트)
- Topaz Gigapixel: https://www.topazlabs.com/gigapixel-ai (v7, 2024)
- Magnific AI: https://magnific.ai/ (2024)
- SUPIR: https://github.com/Fangyi-Chen/SUPIR (2024)
- Upscayl: https://github.com/upscayl/upscayl (v2.11, 2024)
