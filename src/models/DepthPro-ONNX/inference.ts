import {
	AutoModelForDepthEstimation,
	AutoProcessor,
	RawImage,
} from "@huggingface/transformers";

let model: Awaited<
	ReturnType<typeof AutoModelForDepthEstimation.from_pretrained>
>;
let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;

self.onmessage = async (e: MessageEvent<string>) => {
	const url = e.data;

	model ??= await AutoModelForDepthEstimation.from_pretrained(
		"onnx-community/DepthPro-ONNX",
		{ dtype: "q4", progress_callback: (p) => console.log(p) },
	);

	processor ??= await AutoProcessor.from_pretrained(
		"onnx-community/DepthPro-ONNX",
	);

	try {
		const image = await RawImage.read(url);
		const inputs = await processor(image);

		const { predicted_depth } = await model(inputs);

		self.postMessage({
			depth: predicted_depth.data,
			width: predicted_depth.dims.at(-1),
			height: predicted_depth.dims.at(-2),
		});
	} catch (err) {
		console.error("inference failed", err);
	}
};
