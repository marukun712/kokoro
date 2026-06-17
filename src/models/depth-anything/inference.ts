import {
	type DepthEstimationPipeline,
	pipeline,
} from "@huggingface/transformers";

let estimator: DepthEstimationPipeline;
self.onmessage = async (e: MessageEvent<string>) => {
	const url = e.data;

	estimator ??= await pipeline(
		"depth-estimation",
		"onnx-community/depth-anything-v2-large",
		{ progress_callback: (p) => console.log(p) },
	);

	try {
		const { depth } = await estimator(url);

		self.postMessage({
			depth: depth.data,
			width: depth.width,
			height: depth.height,
		});
	} catch (err) {
		console.error("inference failed", err);
	}
};
