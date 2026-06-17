import type { SpriteNode } from "../image/psd";

/**
 * `groupNodes` が返すノードの集合。
 * プロパティへの代入は内包する全 Container に一括反映される。
 */
export interface Group {
	/** グループに含まれるノード一覧 */
	nodes: SpriteNode[];
	/** 全ノードの X 座標 */
	x: number;
	/** 全ノードの Y 座標 */
	y: number;
	/** 全ノードのアルファ値 */
	alpha: number;
	/** 全ノードの表示状態 */
	visible: boolean;
	/** 全ノードの X スケール */
	scaleX: number;
	/** 全ノードの Y スケール */
	scaleY: number;
}

/** `GroupMatcher` が受け取るノードの最小インタフェース */
export type Matchable = { name: string; path: string[] };

/** ノードを受け取って一致するか返す述語関数 */
export type GroupMatcher = (node: Matchable) => boolean;

/**
 * `matcher` に一致するノードをまとめた {@link Group} を返す。
 * プロパティへの代入は全ノードの Container に一括反映される。
 *
 * @param nodes   - 検索対象のノード一覧
 * @param matcher - 絞り込み条件
 */
export function groupNodes(nodes: SpriteNode[], matcher: GroupMatcher): Group {
	const matched = nodes.filter(matcher);
	const containers = matched.map((n) => n.container);

	return {
		nodes: matched,
		get x() {
			return containers[0]?.x ?? 0;
		},
		set x(v) {
			containers.forEach((c) => {
				c.x = v;
			});
		},
		get y() {
			return containers[0]?.y ?? 0;
		},
		set y(v) {
			containers.forEach((c) => {
				c.y = v;
			});
		},
		get alpha() {
			return containers[0]?.alpha ?? 1;
		},
		set alpha(v) {
			containers.forEach((c) => {
				c.alpha = v;
			});
		},
		get visible() {
			return containers[0]?.visible ?? true;
		},
		set visible(v) {
			containers.forEach((c) => {
				c.visible = v;
			});
		},
		get scaleX() {
			return containers[0]?.scale.x ?? 1;
		},
		set scaleX(v) {
			containers.forEach((c) => {
				c.scale.x = v;
			});
		},
		get scaleY() {
			return containers[0]?.scale.y ?? 1;
		},
		set scaleY(v) {
			containers.forEach((c) => {
				c.scale.y = v;
			});
		},
	};
}

/** レイヤー名が完全一致するノードにマッチする `GroupMatcher` を返す */
export function byName(name: string): GroupMatcher {
	return (n) => n.name === name;
}

/**
 * パスの末尾が `path` と一致するノードにマッチする `GroupMatcher` を返す。
 *
 * @param path - 末尾と照合するパスセグメントの配列
 */
export function byPath(path: string[]): GroupMatcher {
	return (n) =>
		path.every((seg, i) => n.path[n.path.length - path.length + i] === seg);
}

/**
 * パスに `groupName` を含み、`negative` に含まれるグループ名を持たないノードにマッチする `GroupMatcher` を返す。
 *
 * @param groupName - 含む必要があるグループ名
 * @param negative  - 含んではいけないグループ名の配列
 */
export function psdGroup(groupName: string, negative?: string[]): GroupMatcher {
	return (n) =>
		n.path.includes(groupName) &&
		!negative?.some((neg) => n.path.includes(neg));
}

/**
 * 複数の `GroupMatcher` を OR 結合する。いずれか1つでも `true` を返せばマッチとみなす。
 *
 * @param matchers - 結合するマッチャー
 */
export function or(...matchers: GroupMatcher[]): GroupMatcher {
	return (n) => matchers.some((m) => m(n));
}
