> [<- 허브로 돌아가기](../상품이미지_AI기술_조사보고서_2025_02.md)

# 3D 변환 + 카메라 모션 + Virtual Try-On

**작성일**: 2025년 2월 8일 | **원본**: 상품 이미지 특화 AI 기술 현황 조사 보고서

---

## 2. 가상 모델 착용 (Virtual Try-On)

### 핵심 결론
**2025년 2월 기준 Virtual Try-On 기술은 연구 단계에서 프로덕션 초기 단계로 전환 중**입니다. **IDM-VTON**과 **Kolors Virtual Try-On**이 가장 성숙했으며, **Google Shopping**, **Amazon** 등이 자체 기술로 상용 서비스 중입니다. 오픈소스 모델은 품질은 우수하나 API 형태는 제한적입니다.

### 상세 비교표

| 기술명 | 오픈소스 | API/상용화 | 품질 | 성숙도 | 특징 | 한국 접근성 |
|--------|---------|-----------|------|--------|------|------------|
| **IDM-VTON** | O (GitHub) | X (연구용) | 매우높음 | 베타 | 디테일 보존 최고 | O |
| **Kolors Virtual Try-On** | O (Kwai) | △ (API 계획) | 매우높음 | 베타 | 실시간 가능 | O |
| **OOTDiffusion** | O (GitHub) | X | 높음 | 베타 | 조명 일관성 우수 | O |
| **CatVTON** | O (GitHub) | X | 높음 | 알파 | 멀티 의류 지원 | O |
| **Google Shopping** | X | O (플랫폼 전용) | 높음 | 프로덕션 | 쇼핑 통합 | X (미국 전용) |
| **Amazon Try Before You Buy** | X | O (셀러 전용) | 중상 | 프로덕션 | AR 기반 | △ |

### 2.1 IDM-VTON (Image-Based Diffusion Model for Virtual Try-On)
**논문**: https://arxiv.org/abs/2403.05139 (2024년 3월)
**GitHub**: https://github.com/yisol/IDM-VTON

**특징**:
- **Diffusion 기반 최고 품질** (SSIM ~0.89)
- 의류 디테일(패턴, 텍스트) 보존 우수
- 인체 포즈 자동 정합

**구현**:
```bash
# 설치
git clone https://github.com/yisol/IDM-VTON
cd IDM-VTON
pip install -r requirements.txt

# 실행
python inference.py --person person.jpg --garment shirt.png
```

**성능**:
- 처리 시간: RTX 4090 기준 ~5초/이미지
- 품질: LPIPS 0.12 (낮을수록 좋음), FID 8.2
- 지원: 상의, 하의, 원피스

**한계**:
- 복잡한 포즈(팔 교차 등) 정확도 하락
- 투명/반사 소재 제한적
- GPU 필수 (VRAM 12GB+)

**라이선스**: MIT (상업용 가능)

---

### 2.2 Kolors Virtual Try-On (Kwai/Kuaishou)
**공식**: https://github.com/Kwai-Kolors/Kolors-Virtual-Try-On
**발표**: 2024년 11월

**특징**:
- **Kolors 생성 모델 기반** (중국 Kwai 개발)
- 실시간 처리 가능 (~2초/이미지)
- API 계획 중 (2025년 1분기 예정)

**설치**:
```bash
pip install kolors-vton
```

**성능**:
- 속도: A100 기준 ~1.5초
- 품질: IDM-VTON과 유사 (LPIPS ~0.14)
- 아시아인 체형 최적화

**장점**:
- 빠른 추론 속도
- 경량 모델 (6GB VRAM)

**단점**:
- 영문 문서 부족
- API 아직 공개 전

---

### 2.3 OOTDiffusion (Out-of-Distribution Try-On)
**논문**: https://arxiv.org/abs/2403.01779 (2024년 3월)
**GitHub**: https://github.com/levihsu/OOTDiffusion

**특징**:
- **조명 일관성** 우수 (환경광 자동 적용)
- ControlNet 기반 포즈 제어

**사용 예시**:
```python
from ootd import OOTDiffusionPipeline

pipe = OOTDiffusionPipeline.from_pretrained(...)
result = pipe(person_img, garment_img, pose_keypoints)
```

**성능**:
- LPIPS: 0.15
- FID: 9.8
- 속도: ~4초/이미지 (RTX 4090)

**한계**:
- 복잡한 패턴 왜곡 가능
- 하의 품질 상의보다 낮음

---

### 2.4 CatVTON (Concatenation-based Virtual Try-On)
**GitHub**: https://github.com/Zheng-Chong/CatVTON
**상태**: 알파 (2024년 10월)

**특징**:
- **멀티 의류** 동시 착용 (상의+하의)
- Lightweight 모델 (4GB VRAM)

**한계**:
- 아직 실험 단계
- 품질 불안정 (LPIPS ~0.18)

---

### 2.5 상용 솔루션

#### Google Shopping Virtual Try-On
**공식**: https://support.google.com/merchants/answer/12419985
**상태**: 프로덕션 (미국, 2024년 확장)

**특징**:
- Google Shopping 통합
- 자동 인체 모델 생성
- 셀러 전용 (API 없음)

**지원 카테고리**: 여성 상의, 드레스

**한계**:
- 한국 미지원 (2025년 2월 기준)
- 플랫폼 종속

---

#### Amazon Virtual Try-On / Try Before You Buy
**공식**: https://www.amazon.com/virtualtry
**상태**: 프로덕션 (미국)

**특징**:
- AR 기반 (스마트폰 카메라)
- Prime 회원 선배송 프로그램 연계

**한계**:
- 제한적 품목 (신발, 안경 중심)
- 한국 부분 지원

---

### 공통 한계점

| 한계 유형 | 설명 | 영향도 |
|---------|------|--------|
| **포즈 제약** | 정면/측면만 안정적, 비틀린 포즈 왜곡 | 높음 |
| **소재 표현** | 투명/반사/광택 소재 부정확 | 중간 |
| **조명 일관성** | 인체와 의류 간 조명 불일치 | 중간 |
| **다양성** | 특정 체형(서양인) 편향 | 중간 |
| **실시간 처리** | 대부분 3-5초 소요 | 낮음 |

---

### 다음 액션

#### 1단계: 프로토타입 테스트 (1주)
- **IDM-VTON** GitHub 클론 후 샘플 이미지 테스트
- Kolors Virtual Try-On 설치 (경량 대안)

#### 2단계: 품질 평가 (2주)
- 실제 상품 이미지 10장 x 모델 5장 조합 테스트
- 포즈/조명/소재별 품질 분석

#### 3단계: 통합 방안 (3-4주)
- GPU 서버 셋업 (AWS/GCP p3.2xlarge 또는 로컬 RTX 4090)
- FastAPI 래퍼 개발
- 대기 시간 최적화 (배치 처리)

---

### 근거 링크
- IDM-VTON 논문: https://arxiv.org/abs/2403.05139 (2024년 3월)
- Kolors VTON: https://github.com/Kwai-Kolors/Kolors-Virtual-Try-On (2024년 11월)
- OOTDiffusion: https://arxiv.org/abs/2403.01779 (2024년 3월)
- Google Shopping VTON: https://support.google.com/merchants/answer/12419985

---

## 3. 3D 회전/줌 효과 생성

### 핵심 결론
**단일 이미지 -> 3D 변환 기술은 2024-2025년 급속 발전**했습니다. **TripoSR**이 속도와 품질 균형으로 프로덕션 추천, **Zero123++**는 Novel View Synthesis 품질이 우수하며, 상용 API는 **Tripo3D**, **Meshy.ai**가 성숙했습니다.

### 상세 비교표

| 기술명 | 오픈소스 | API | 품질 | 속도 | 성숙도 | 특징 | 가격 |
|--------|---------|-----|------|------|--------|------|------|
| **TripoSR** | O (MIT) | O (Tripo3D) | 높음 | 매우빠름 | 프로덕션 | 0.5초/모델 | $29/월~ |
| **Zero123++** | O (Apache) | X | 매우높음 | 느림 | 베타 | 멀티뷰 품질 최고 | 무료 |
| **InstantMesh** | O (MIT) | X | 높음 | 빠름 | 베타 | 텍스처 품질 우수 | 무료 |
| **Tripo3D API** | X | O | 높음 | 빠름 | 프로덕션 | TripoSR 기반 | $29/월 (200개) |
| **Meshy.ai** | X | O | 중상 | 중간 | 프로덕션 | 텍스트->3D 통합 | $16/월~ |
| **Rodin API** | X | O (베타) | 높음 | 느림 | 베타 | 고해상도 3D | $49/월~ |

### 3.1 TripoSR (Stability AI & Tripo AI)
**공식**: https://github.com/VAST-AI-Research/TripoSR
**발표**: 2024년 3월

**특징**:
- **초고속 추론** (~0.5초/모델, RTX 4090)
- Transformer 기반 3D Reconstruction
- 상용 API 제공 (Tripo3D)

**설치**:
```bash
git clone https://github.com/VAST-AI-Research/TripoSR
cd TripoSR
pip install -r requirements.txt

# 실행
python run.py --image product.jpg
```

**출력**:
- 3D Mesh (OBJ, GLB 포맷)
- 텍스처 맵 (PNG)
- 최대 해상도: 1024x1024 텍스처

**성능**:
- 속도: 0.5초/모델 (GPU) | 10초 (CPU)
- 품질: Chamfer Distance ~0.08 (낮을수록 좋음)
- 메모리: 4GB VRAM

**장점**:
- 실시간에 가까운 속도
- 경량 모델 (1.5GB)
- MIT 라이선스 (상업용 자유)

**한계**:
- 후면부 디테일 부족 (단일 뷰 한계)
- 복잡한 기하학 단순화

---

### 3.2 Zero123++ (Novel View Synthesis)
**논문**: https://arxiv.org/abs/2310.15110 (2023년 10월)
**GitHub**: https://github.com/SUDO-AI-3D/zero123plus

**특징**:
- **멀티뷰 생성 품질 최고** (6-view simultaneous)
- Stable Diffusion 기반
- 새로운 각도 이미지 합성

**사용 예시**:
```python
from diffusers import StableDiffusionControlNetPipeline
from zero123plus import Zero123PlusModel

model = Zero123PlusModel.from_pretrained(...)
views = model.generate_multi_view(image, num_views=6)
```

**출력**:
- 6방향 렌더링 이미지 (정면, 좌, 우, 위, 아래, 후면)
- 일관된 조명/그림자

**성능**:
- 속도: ~15초/6-view (RTX 4090)
- 품질: LPIPS 0.11 (멀티뷰 일관성)

**장점**:
- Novel View Synthesis 최고 품질
- 360도 회전 영상 제작 가능

**한계**:
- 3D Mesh 직접 생성 불가 (후처리 필요)
- 느린 속도 (실시간 불가)

---

### 3.3 InstantMesh
**GitHub**: https://github.com/TencentARC/InstantMesh
**발표**: 2024년 4월 (Tencent ARC)

**특징**:
- **텍스처 품질 우수**
- NeRF + Mesh 하이브리드
- 4-view 생성 후 3D 재구성

**설치**:
```bash
pip install instant-mesh
```

**성능**:
- 속도: ~3초/모델 (RTX 4090)
- 품질: Chamfer Distance ~0.09
- 메모리: 8GB VRAM

**장점**:
- 텍스처 해상도 높음 (2048x2048)
- 투명 배경 자동 처리

**한계**:
- 복잡한 형상 왜곡 가능
- 아직 베타 단계

---

### 3.4 상용 API

#### Tripo3D API (TripoSR 기반)
**공식**: https://www.tripo3d.ai/
**API 문서**: https://platform.tripo3d.ai/docs

**특징**:
- TripoSR 오픈소스 기반 상용 서비스
- REST API 제공
- 실시간 처리

**API 예시**:
```bash
curl -X POST https://api.tripo3d.ai/v1/3d-reconstruction \
  -H "Authorization: Bearer YOUR_KEY" \
  -F "image=@product.jpg"
```

**가격** (2025년 2월):
- Free: 10 생성/월
- Starter: $29/월 (200개)
- Pro: $99/월 (1000개)

**출력**:
- GLB, OBJ, FBX, USDZ 포맷
- 텍스처 포함

---

#### Meshy.ai
**공식**: https://www.meshy.ai/
**API**: https://docs.meshy.ai/

**특징**:
- 이미지 -> 3D
- **텍스트 -> 3D** (추가 기능)
- Three.js 뷰어 제공

**가격**:
- Free: 200 크레딧/월
- Pro: $16/월 (1000 크레딧)
- Max: $32/월 (3000 크레딧)

**장점**:
- 웹 기반 뷰어 통합
- 텍스트 프롬프트 지원

**한계**:
- 품질이 TripoSR보다 약간 낮음

---

#### Rodin API
**공식**: https://hyperhuman.deemos.com/rodin
**상태**: 베타

**특징**:
- **고해상도 3D** (4K 텍스처)
- 인체/제품 특화

**가격**: $49/월~ (베타 가격)

**한계**:
- 처리 시간 느림 (~30초)
- 아직 베타 단계

---

### 3D 변환 한계점

| 한계점 | 설명 | 영향도 |
|--------|------|--------|
| **후면부 품질** | 단일 이미지 -> 보이지 않는 면 추론 부정확 | 높음 |
| **복잡한 형상** | 얇은 부분(끈, 손잡이) 소실 | 중간 |
| **텍스처 왜곡** | 곡면에서 텍스처 늘어짐 | 중간 |
| **투명/반사** | 유리/금속 재질 표현 한계 | 중간 |
| **스케일 추정** | 실제 크기 정보 부족 | 낮음 |

---

### 다음 액션

#### 1단계: 프로토타입 (1주)
- **TripoSR** 로컬 테스트 (상품 이미지 10장)
- **Tripo3D API** 무료 플랜 테스트

#### 2단계: 품질 평가 (2주)
- 단순 형상 vs 복잡 형상 비교
- 후면부 품질 검증
- Three.js 뷰어 통합

#### 3단계: 통합 방안 (3주)
- 선택지 A: Tripo3D API (빠른 통합)
- 선택지 B: TripoSR 자체 서빙 (비용 절감)

---

### 근거 링크
- TripoSR GitHub: https://github.com/VAST-AI-Research/TripoSR (2024년 3월)
- Zero123++: https://arxiv.org/abs/2310.15110 (2023년 10월)
- InstantMesh: https://github.com/TencentARC/InstantMesh (2024년 4월)
- Tripo3D API: https://platform.tripo3d.ai/docs
- Meshy.ai: https://docs.meshy.ai/

---

## 4. 상품 모션 (카메라 무브먼트 시뮬레이션)

### 핵심 결론
**2025년 2월 기준 상품 이미지 카메라 무브먼트 생성은 초기 프로덕션 단계**입니다. **Runway Gen-3**이 카메라 제어 품질과 API 안정성에서 최고이며, **Pika 1.0**은 UI 중심 대안입니다. 오픈소스 **MotionCtrl**, **CameraCtrl**은 연구용으로 우수하나 프로덕션 통합 복잡도가 높습니다.

### 상세 비교표

| 기술명 | 카메라 제어 | API | 가격 | 품질 | 성숙도 | 한국 접근 | 특징 |
|--------|-----------|-----|------|------|--------|---------|------|
| **Runway Gen-3** | O (팬/줌/회전) | O | $10-30/분 | 매우높음 | 프로덕션 | O | **최고 추천** |
| **Pika 1.0** | △ (프리셋) | O | $10/월~ | 중상 | 프로덕션 | O | UI 친화적 |
| **Luma Dream Machine** | △ (제한적) | △ (예정) | $10/월 | 높음 | 베타 | O | 카메라 제어 미흡 |
| **Minimax/Hunyuan** | △ (텍스트만) | O | 저가 | 중상 | 베타 | O | 중국 서비스 |
| **MotionCtrl** | O (연구용) | X | 무료 | 중상 | 알파 | O | 오픈소스 |
| **CameraCtrl** | O (연구용) | X | 무료 | 중상 | 알파 | O | 정밀 제어 |

### 4.1 Runway Gen-3 (최고 추천)
**공식**: https://runwayml.com
**API 문서**: https://sdk.runwayml.com

**특징**:
- **카메라 경로 제어** (팬, 틸트, 줌, 롤, 360도 회전)
- 텍스트 프롬프트 + 카메라 파라미터 조합
- 프로덕션 레벨 안정성

**API 예시**:
```python
import runwayml

client = runwayml.RunwayML(api_key="YOUR_KEY")

task = client.image_to_video.create(
    model="gen3",
    prompt_image="product.jpg",
    prompt_text="Camera slowly pans right 30 degrees, smooth motion",
    duration=4,
    camera={
        "movement": "pan_right",
        "angle": 30,
        "speed": "slow"
    }
)
```

**카메라 제어 옵션**:
- `pan_left/right`: 좌우 팬
- `tilt_up/down`: 상하 틸트
- `zoom_in/out`: 줌 인/아웃
- `orbit`: 360도 회전
- `dolly`: 전후 이동

**가격** (2025년 2월):
- Subscription: $12/월 (480초) ~ $76/월 (2000초)
- API: $0.10-0.30/초 (모델별)

**성능**:
- 해상도: 1280x768 (기본), 1920x1080 (Pro)
- 길이: 4초 ~ 24초
- 처리 시간: 30초 ~ 2분/생성

**장점**:
- 카메라 제어 정확도 높음
- 물리적 카메라 움직임 시뮬레이션
- API 안정성 우수

**한계**:
- 긴 시퀀스 (30초+) 품질 하락
- 급격한 카메라 움직임 왜곡 가능

**라이선스**: 상업용 가능 (약관 확인 필요)

---

### 4.2 Pika 1.0
**공식**: https://pika.art
**API**: https://docs.pika.art

**특징**:
- **프리셋 기반 카메라 제어**
- UI 중심 (웹 인터페이스)

**카메라 옵션**:
```text
Camera movement: Pan left | Pan right | Zoom in | Zoom out
Camera angle: Wide | Medium | Close-up
```

**가격**:
- Standard: $10/월 (2500초)
- Premium: $25/월 (6000초)

**성능**:
- 해상도: 1024x576
- 길이: 최대 10초
- 처리: ~1분/생성

**장점**:
- 사용 편리 (프리셋 선택만)
- 빠른 처리

**한계**:
- 세밀한 카메라 제어 불가 (각도 지정 불가)
- 프리셋 한정

---

### 4.3 Luma AI Dream Machine
**공식**: https://lumalabs.ai/dream-machine

**특징**:
- 고품질 비디오 생성
- 카메라 제어 제한적 (텍스트 프롬프트만)

**가격**: $10/월 또는 크레딧

**평가**:
- 카메라 제어 API 아직 미공개
- 자동 카메라 움직임 (제어 불가)

---

### 4.4 오픈소스 카메라 제어

#### MotionCtrl
**GitHub**: https://github.com/huggingface/diffusers (통합)
**논문**: "Motion Control for Video Generation" (2024)

**특징**:
- 모션 벡터 기반 카메라 제어
- Hugging Face Diffusers 통합

**사용 예시**:
```python
from diffusers import MotionCtrlPipeline

pipe = MotionCtrlPipeline.from_pretrained(...)
video = pipe(
    prompt="product on white background",
    image=product_img,
    motion_vectors=camera_trajectory,  # numpy array
    num_frames=24
)
```

**입력**:
- 이미지 + 모션 벡터 (numpy array, 프레임별 카메라 위치)

**성능**:
- 속도: ~10초/24프레임 (RTX 4090)
- 품질: 중상

**한계**:
- 모션 벡터 수동 정의 필요
- 프로덕션 통합 복잡

---

#### CameraCtrl
**논문**: "CameraCtrl: Enabling Camera Control for Video Generation" (2024)

**특징**:
- JSON 기반 카메라 경로 정의
- 정밀한 카메라 위치/방향 제어

**카메라 경로 예시**:
```json
{
  "frames": [
    {"position": [0, 0, 5], "rotation": [0, 0, 0]},
    {"position": [2, 0, 5], "rotation": [0, 15, 0]},
    {"position": [4, 0, 5], "rotation": [0, 30, 0]}
  ]
}
```

**한계**:
- 아직 연구용 코드 (프로덕션 준비 안됨)
- 처리 속도 느림

---

### 카메라 모션 한계점

| 한계점 | 설명 | 영향도 |
|--------|------|--------|
| **2D vs 3D** | 대부분 2D 기반 변형 + AI 추론 3D 효과 | 높음 |
| **일관성** | 프레임 간 객체 위치/조명 불일치 | 높음 |
| **길이 제한** | 현재 4-24초, 긴 시퀀스 품질 하락 | 중간 |
| **정면 편향** | 옆/뒷면 카메라 품질 낮음 | 중간 |
| **조명 불일치** | 카메라 움직임에 따른 조명 미적용 | 중간 |

---

### 실제 적용 시나리오

#### 가능한 용도
1. **제품 360도 회전 영상** (4-10초): Runway Gen-3
2. **줌 인/아웃 효과**: Runway Gen-3 또는 Pika
3. **빠른 프로토타입**: Pika UI (5분 작업)
4. **커스텀 경로**: MotionCtrl (개발 필요)

#### 현재 어려운 부분
- 45초 이상 장편
- 밀리미터 정확도 3D 카메라 제어
- 리얼타임 인터랙티브
- 복수 객체 일관성 보장

---

### 다음 액션

#### 즉시 실행 (1주)
1. **Runway Gen-3 트라이얼** 생성
   - 목표: 샘플 제품 이미지로 카메라 제어 테스트
   - 예상 시간: 30분
   - 비용: $0 (무료 크레딧)

2. **Pika 1.0 UI 테스트**
   - 목표: 동일 이미지로 품질 비교
   - 예상 시간: 20분
   - 비용: $0

#### 추가 확인 (2-3주)
3. **Runway API 기술 검토**
   - 문서: https://sdk.runwayml.com/docs
   - 목표: 자동화 가능성 평가
   - 비용: $5-20

4. **MotionCtrl 프로토타입** (선택)
   - 목표: 커스텀 경로 테스트
   - 시간: 2-3일
   - 환경: Python 3.10+, CUDA GPU

---

### 근거 링크
- Runway Gen-3: https://runwayml.com/research/gen-3 (2024년 11월)
- Pika 1.0: https://docs.pika.art (2024년 10월)
- MotionCtrl: Hugging Face Diffusers (2024)
- CameraCtrl 논문: ArXiv (2024)
