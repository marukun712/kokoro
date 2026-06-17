import type { SpriteNode } from "../image/psd";

/** 1フレームの変形量 */
export interface Transform {
	/** X 方向の平行移動量 (ピクセル) */
	tx: number;
	/** Y 方向の平行移動量 (ピクセル) */
	ty: number;
	/** 回転量 (ラジアン) */
	rot?: number;
	/** 回転の起点 (UV座標) */
	pivot?: { u: number; v: number };
}

/**
 * 頂点の UV 座標を受け取り、その頂点の変形量 ({@link Transform}) を返す純粋関数。
 * 複数の `Pose` を `Rig.apply` に渡すとウェイト加算で合成される。
 */
export type Pose = (u: number, v: number) => Transform;

/**
 * ノード群の頂点を毎フレーム書き換えてメッシュ変形を行うクラス。
 * コンストラクタでバウンディングボックスを計算し、UV 正規化の基準として使う。
 */
export class Rig {
	/** ローカル座標の初期頂点バッファ */
	private readonly origVerts: Float32Array;
	/** ワールド座標の初期頂点バッファ */
	private readonly globalOrigVerts: Float32Array;
	/** 変形後の頂点バッファ */
	private readonly verts: Float32Array;

	private readonly nodeRanges: Array<{
		node: SpriteNode;
		start: number;
		end: number;
	}> = [];

	readonly minX: number;
	readonly minY: number;
	readonly w: number;
	readonly h: number;

	constructor(nodes: SpriteNode[]) {
		// 全ノードの頂点数を集計してバッファを確保
		let total = 0;
		for (const node of nodes) {
			const count =
				(node.sprite.geometry.getBuffer("aPosition").data as Float32Array)
					.length / 2;
			this.nodeRanges.push({ node, start: total, end: total + count });
			total += count;
		}

		this.origVerts = new Float32Array(total * 2);
		this.globalOrigVerts = new Float32Array(total * 2);
		this.verts = new Float32Array(total * 2);

		// 初期頂点を記録
		for (const { node, start, end } of this.nodeRanges) {
			const data = node.sprite.geometry.getBuffer("aPosition")
				.data as Float32Array;
			const ox = node.sprite.x + node.container.x;
			const oy = node.sprite.y + node.container.y;
			for (let vi = start; vi < end; vi++) {
				const li = vi - start;
				this.origVerts[vi * 2] = data[li * 2];
				this.origVerts[vi * 2 + 1] = data[li * 2 + 1];
				this.globalOrigVerts[vi * 2] = data[li * 2] + ox;
				this.globalOrigVerts[vi * 2 + 1] = data[li * 2 + 1] + oy;
			}
		}

		this.verts.set(this.origVerts);

		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;

		for (const node of nodes) {
			const data = node.sprite.geometry.getBuffer("aPosition")
				.data as Float32Array;
			const ox = node.sprite.x + node.container.x;
			const oy = node.sprite.y + node.container.y;
			const count = data.length / 2;
			for (let i = 0; i < count; i++) {
				const gx = data[i * 2] + ox;
				const gy = data[i * 2 + 1] + oy;
				if (gx < minX) minX = gx;
				if (gx > maxX) maxX = gx;
				if (gy < minY) minY = gy;
				if (gy > maxY) maxY = gy;
			}
		}

		const bounds = { minX, minY, w: maxX - minX, h: maxY - minY };

		this.minX = bounds.minX;
		this.minY = bounds.minY;
		this.w = bounds.w;
		this.h = bounds.h;
	}

	/** 変形済みバッファをメッシュに書き戻す */
	private applyVerts(): void {
		for (const { node, start, end } of this.nodeRanges) {
			const buffer = node.sprite.geometry.getBuffer("aPosition");
			const data = buffer.data as Float32Array;
			for (let vi = start; vi < end; vi++) {
				data[(vi - start) * 2] = this.verts[vi * 2];
				data[(vi - start) * 2 + 1] = this.verts[vi * 2 + 1];
			}
			buffer.update();
		}
	}

	/**
	 * ポーズを合成して頂点変形を適用する。毎フレーム呼び出す。
	 * 複数のポーズはウェイト加算で合成される。
	 *
	 * @param poses - 適用するポーズの配列
	 */
	public apply(poses: Pose[]): void {
		const total = this.origVerts.length / 2;

		for (let vi = 0; vi < total; vi++) {
			const gx = this.globalOrigVerts[vi * 2];
			const gy = this.globalOrigVerts[vi * 2 + 1];

			const u = (gx - this.minX) / this.w;
			const v = (gy - this.minY) / this.h;

			let totalTx = 0,
				totalTy = 0;

			for (const pose of poses) {
				const tr = pose(u, v);
				if (tr.rot !== undefined && tr.pivot !== undefined) {
					const px = this.minX + tr.pivot.u * this.w;
					const py = this.minY + tr.pivot.v * this.h;
					const dx = gx - px;
					const dy = gy - py;
					const cos = Math.cos(tr.rot);
					const sin = Math.sin(tr.rot);
					totalTx += dx * cos - dy * sin - dx + tr.tx;
					totalTy += dx * sin + dy * cos - dy + tr.ty;
				} else {
					totalTx += tr.tx;
					totalTy += tr.ty;
				}
			}

			this.verts[vi * 2] = this.origVerts[vi * 2] + totalTx;
			this.verts[vi * 2 + 1] = this.origVerts[vi * 2 + 1] + totalTy;
		}

		this.applyVerts();
	}
}
