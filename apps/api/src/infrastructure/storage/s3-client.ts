import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
	S3ServiceException,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../../shared/config.js'

/**
 * S3 호환 스토리지 클라이언트
 * AWS S3, MinIO, Cloudflare R2 등 S3 호환 스토리지 지원
 */
class S3StorageClient {
	private client: S3Client
	private bucket: string
	private endpoint: string

	constructor() {
		this.bucket = config.S3_BUCKET
		this.endpoint = config.S3_ENDPOINT

		this.client = new S3Client({
			endpoint: this.endpoint,
			region: 'auto',
			credentials: {
				accessKeyId: config.S3_ACCESS_KEY,
				secretAccessKey: config.S3_SECRET_KEY,
			},
			forcePathStyle: true,
		})
	}

	/**
	 * 이미지 업로드
	 * @param buffer - 업로드할 파일 버퍼
	 * @param key - S3에 저장될 객체 키 (경로 포함)
	 * @param contentType - MIME 타입 (예: image/jpeg, image/png)
	 * @returns 업로드된 객체의 키
	 */
	async uploadImage(
		buffer: Buffer,
		key: string,
		contentType: string,
	): Promise<{ key: string; url: string }> {
		try {
			const command = new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				Body: buffer,
				ContentType: contentType,
			})

			await this.client.send(command)

			return {
				key,
				url: this.getPublicUrl(key),
			}
		} catch (error) {
			if (error instanceof S3ServiceException) {
				throw new Error(`S3 upload failed: ${error.message}`)
			}
			throw error
		}
	}

	/**
	 * 서명된 URL 생성 (비공개 객체 접근용)
	 * @param key - 객체 키
	 * @param expiresIn - URL 만료 시간 (초), 기본값 3600초 (1시간)
	 * @returns 서명된 URL
	 */
	async getImageUrl(key: string, expiresIn = 3600): Promise<string> {
		try {
			const command = new GetObjectCommand({
				Bucket: this.bucket,
				Key: key,
			})

			const signedUrl = await getSignedUrl(this.client, command, {
				expiresIn,
			})

			return signedUrl
		} catch (error) {
			if (error instanceof S3ServiceException) {
				throw new Error(`Failed to generate signed URL: ${error.message}`)
			}
			throw error
		}
	}

	/**
	 * 이미지 삭제
	 * @param key - 삭제할 객체 키
	 */
	async deleteImage(key: string): Promise<void> {
		try {
			const command = new DeleteObjectCommand({
				Bucket: this.bucket,
				Key: key,
			})

			await this.client.send(command)
		} catch (error) {
			if (error instanceof S3ServiceException) {
				throw new Error(`S3 delete failed: ${error.message}`)
			}
			throw error
		}
	}

	/**
	 * 공개 URL 생성 (버킷이 public access를 허용하는 경우)
	 * @param key - 객체 키
	 * @returns 공개 접근 가능한 URL
	 */
	getPublicUrl(key: string): string {
		// 엔드포인트가 이미 버킷 이름을 포함하는지 확인
		const baseUrl = this.endpoint.endsWith('/') ? this.endpoint.slice(0, -1) : this.endpoint

		return `${baseUrl}/${this.bucket}/${key}`
	}

	/**
	 * 여러 이미지 일괄 삭제
	 * @param keys - 삭제할 객체 키 배열
	 */
	async deleteImages(keys: string[]): Promise<void> {
		await Promise.all(keys.map((key) => this.deleteImage(key)))
	}
}

// 싱글톤 인스턴스
export const s3Client = new S3StorageClient()

// 개별 함수 export (편의용)
export const uploadImage = (buffer: Buffer, key: string, contentType: string) =>
	s3Client.uploadImage(buffer, key, contentType)

export const getImageUrl = (key: string, expiresIn?: number) => s3Client.getImageUrl(key, expiresIn)

export const deleteImage = (key: string) => s3Client.deleteImage(key)

export const deleteImages = (keys: string[]) => s3Client.deleteImages(keys)
