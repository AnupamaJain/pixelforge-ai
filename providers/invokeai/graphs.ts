/**
 * InvokeAI graph builders.
 *
 * InvokeAI executes node graphs submitted to its session queue. The node types
 * and field names below were taken from the InvokeAI source
 * (invokeai/app/invocations/*) — `sdxl_model_loader`, `sdxl_compel_prompt`,
 * `noise`, `denoise_latents`, `l2i`, `i2l` and `esrgan`.
 *
 * InvokeAI is licensed Apache-2.0. We talk to it over HTTP and vendor none of
 * its code; see THIRD_PARTY_LICENSES.md.
 */

export interface GraphNode {
  id: string;
  type: string;
  [field: string]: unknown;
}

export interface GraphEdge {
  source: { node_id: string; field: string };
  destination: { node_id: string; field: string };
}

export interface InvokeGraph {
  id: string;
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
}

export interface ModelIdentifier {
  key: string;
  hash: string;
  name: string;
  base: string;
  type: string;
}

const SEGMENT_NODE = {
  detect: "detect",
  segment: "segment",
  cutout: "cutout",
} as const;

const NODE = {
  model: "model_loader",
  positive: "positive_cond",
  negative: "negative_cond",
  noise: "noise",
  denoise: "denoise",
  decode: "decode",
  encode: "encode",
  resize: "resize",
  upscale: "upscale",
} as const;

/** The node whose output image we collect, per graph kind. */
export const OUTPUT_NODE = {
  textToImage: NODE.decode,
  imageToImage: NODE.decode,
  upscale: NODE.upscale,
  removeBackground: SEGMENT_NODE.cutout,
} as const;

/**
 * Background removal, as a Grounded-SAM chain.
 *
 * `grounding_dino` locates the object from a text prompt and emits bounding
 * boxes; `segment_anything` turns those into a mask tensor; and
 * `apply_tensor_mask_to_image` cuts the subject out, leaving transparency
 * everywhere else. Node names and field names were taken from
 * invokeai/app/invocations/{grounding_dino,segment_anything,mask}.py.
 *
 * `mask_filter: "largest"` matters: a product photo often trips several weak
 * detections (a shadow, a reflection), and we want the single main subject.
 */
export function buildRemoveBackgroundGraph(params: {
  imageName: string;
  /** What to look for. Grounding DINO expects a short noun phrase. */
  prompt?: string;
  detectionThreshold?: number;
  dinoModel?: "grounding-dino-tiny" | "grounding-dino-base";
  samModel?:
    | "segment-anything-base"
    | "segment-anything-large"
    | "segment-anything-huge";
}): InvokeGraph {
  const image = { image_name: params.imageName };

  return {
    id: `rembg_${Date.now()}`,
    nodes: {
      [SEGMENT_NODE.detect]: {
        id: SEGMENT_NODE.detect,
        type: "grounding_dino",
        model: params.dinoModel ?? "grounding-dino-base",
        // A generic noun keeps this working across product categories.
        prompt: params.prompt?.trim() || "the main product object",
        image,
        detection_threshold: params.detectionThreshold ?? 0.3,
        is_intermediate: true,
      },
      [SEGMENT_NODE.segment]: {
        id: SEGMENT_NODE.segment,
        type: "segment_anything",
        model: params.samModel ?? "segment-anything-base",
        image,
        apply_polygon_refinement: true,
        mask_filter: "largest",
        is_intermediate: true,
      },
      [SEGMENT_NODE.cutout]: {
        id: SEGMENT_NODE.cutout,
        type: "apply_tensor_mask_to_image",
        image,
        invert: false,
        is_intermediate: false,
      },
    },
    edges: [
      {
        source: { node_id: SEGMENT_NODE.detect, field: "collection" },
        destination: { node_id: SEGMENT_NODE.segment, field: "bounding_boxes" },
      },
      {
        source: { node_id: SEGMENT_NODE.segment, field: "mask" },
        destination: { node_id: SEGMENT_NODE.cutout, field: "mask" },
      },
    ],
  };
}

function sdxlBase(
  model: ModelIdentifier,
  params: {
    prompt: string;
    negativePrompt: string;
    width: number;
    height: number;
    steps: number;
    guidance: number;
    scheduler: string;
  },
): { nodes: Record<string, GraphNode>; edges: GraphEdge[] } {
  const nodes: Record<string, GraphNode> = {
    [NODE.model]: {
      id: NODE.model,
      type: "sdxl_model_loader",
      model,
    },
    [NODE.positive]: {
      id: NODE.positive,
      type: "sdxl_compel_prompt",
      prompt: params.prompt,
      style: params.prompt,
      original_width: params.width,
      original_height: params.height,
      target_width: params.width,
      target_height: params.height,
      crop_top: 0,
      crop_left: 0,
    },
    [NODE.negative]: {
      id: NODE.negative,
      type: "sdxl_compel_prompt",
      prompt: params.negativePrompt,
      style: params.negativePrompt,
      original_width: params.width,
      original_height: params.height,
      target_width: params.width,
      target_height: params.height,
      crop_top: 0,
      crop_left: 0,
    },
    [NODE.denoise]: {
      id: NODE.denoise,
      type: "denoise_latents",
      steps: params.steps,
      cfg_scale: params.guidance,
      scheduler: params.scheduler,
      denoising_start: 0,
      denoising_end: 1,
    },
    [NODE.decode]: {
      id: NODE.decode,
      type: "l2i",
      fp32: false,
      is_intermediate: false,
    },
  };

  const edges: GraphEdge[] = [
    // CLIP encoders
    { source: { node_id: NODE.model, field: "clip" }, destination: { node_id: NODE.positive, field: "clip" } },
    { source: { node_id: NODE.model, field: "clip2" }, destination: { node_id: NODE.positive, field: "clip2" } },
    { source: { node_id: NODE.model, field: "clip" }, destination: { node_id: NODE.negative, field: "clip" } },
    { source: { node_id: NODE.model, field: "clip2" }, destination: { node_id: NODE.negative, field: "clip2" } },
    // Denoise inputs
    { source: { node_id: NODE.model, field: "unet" }, destination: { node_id: NODE.denoise, field: "unet" } },
    { source: { node_id: NODE.positive, field: "conditioning" }, destination: { node_id: NODE.denoise, field: "positive_conditioning" } },
    { source: { node_id: NODE.negative, field: "conditioning" }, destination: { node_id: NODE.denoise, field: "negative_conditioning" } },
    // Decode
    { source: { node_id: NODE.denoise, field: "latents" }, destination: { node_id: NODE.decode, field: "latents" } },
    { source: { node_id: NODE.model, field: "vae" }, destination: { node_id: NODE.decode, field: "vae" } },
  ];

  return { nodes, edges };
}

export function buildTextToImageGraph(params: {
  model: ModelIdentifier;
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  seed: number;
  scheduler: string;
}): InvokeGraph {
  const { nodes, edges } = sdxlBase(params.model, params);

  nodes[NODE.noise] = {
    id: NODE.noise,
    type: "noise",
    seed: params.seed,
    width: params.width,
    height: params.height,
    use_cpu: true,
  };

  edges.push({
    source: { node_id: NODE.noise, field: "noise" },
    destination: { node_id: NODE.denoise, field: "noise" },
  });

  return { id: `t2i_${Date.now()}`, nodes, edges };
}

export function buildImageToImageGraph(params: {
  model: ModelIdentifier;
  imageName: string;
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  seed: number;
  /** 0..1. Higher means the output departs further from the source. */
  strength: number;
  scheduler: string;
}): InvokeGraph {
  const { nodes, edges } = sdxlBase(params.model, params);

  // InvokeAI expresses img2img as a partial denoise: starting later in the
  // schedule keeps more of the source image.
  const denoisingStart = Math.min(0.99, Math.max(0, 1 - params.strength));
  (nodes[NODE.denoise] as GraphNode).denoising_start = denoisingStart;

  nodes[NODE.resize] = {
    id: NODE.resize,
    type: "img_resize",
    image: { image_name: params.imageName },
    width: params.width,
    height: params.height,
    resample_mode: "bicubic",
    is_intermediate: true,
  };

  nodes[NODE.encode] = {
    id: NODE.encode,
    type: "i2l",
    fp32: false,
    is_intermediate: true,
  };

  nodes[NODE.noise] = {
    id: NODE.noise,
    type: "noise",
    seed: params.seed,
    width: params.width,
    height: params.height,
    use_cpu: true,
  };

  edges.push(
    { source: { node_id: NODE.resize, field: "image" }, destination: { node_id: NODE.encode, field: "image" } },
    { source: { node_id: NODE.model, field: "vae" }, destination: { node_id: NODE.encode, field: "vae" } },
    { source: { node_id: NODE.encode, field: "latents" }, destination: { node_id: NODE.denoise, field: "latents" } },
    { source: { node_id: NODE.noise, field: "noise" }, destination: { node_id: NODE.denoise, field: "noise" } },
  );

  return { id: `i2i_${Date.now()}`, nodes, edges };
}

/**
 * Real-ESRGAN upscale graph. InvokeAI ships x2plus and x4plus weights, so 2×
 * and 4× map to real models rather than a resample.
 */
export function buildUpscaleGraph(params: {
  imageName: string;
  factor: 2 | 4;
  modelName?: string;
}): InvokeGraph {
  const modelName =
    params.modelName ??
    (params.factor === 2 ? "RealESRGAN_x2plus.pth" : "RealESRGAN_x4plus.pth");

  return {
    id: `upscale_${Date.now()}`,
    nodes: {
      [NODE.upscale]: {
        id: NODE.upscale,
        type: "esrgan",
        image: { image_name: params.imageName },
        model_name: modelName,
        tile_size: 400,
        is_intermediate: false,
      },
    },
    edges: [],
  };
}
