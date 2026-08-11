/** Repository coordinates used by outbound links. */
export const REPO_OWNER = 'psknlr'
export const REPO_NAME = 'Tao-Shanghan-Corpus'
export const REPO_BRANCH = 'main'

export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`
export const TREE_URL = `${REPO_URL}/tree/${REPO_BRANCH}`
export const RELEASES_URL = `${REPO_URL}/releases`

/** Repository archive. GitHub does not count these, so it is only the fallback. */
export const ARCHIVE_URL = `${REPO_URL}/archive/refs/heads/${REPO_BRANCH}.zip`

/**
 * Downloads are only counted by GitHub when they go through a release asset, so
 * every download control on the site resolves its href through here: the real
 * asset when a release exists, the uncounted archive otherwise.
 */
export function downloadHref(metrics: { available: boolean; latest_asset: { url: string } | null } | null): string {
  return metrics?.available && metrics.latest_asset?.url ? metrics.latest_asset.url : ARCHIVE_URL
}

/** Deep links into the released layers. */
export const LAYER_URL = {
  catalog: `${TREE_URL}/01_source_catalog`,
  texts: `${TREE_URL}/02_source_texts`,
  clauses: `${TREE_URL}/03_clauses`,
  commentaries: `${TREE_URL}/04_commentaries`,
  variants: `${TREE_URL}/05_textual_variants`,
  relations: `${TREE_URL}/06_relations`,
  unified: `${TREE_URL}/07_unified_records`,
  review: `${TREE_URL}/08_manual_review`,
  validation: `${TREE_URL}/09_validation`,
  code: `${TREE_URL}/code`,
  dictionary: `${REPO_URL}/blob/${REPO_BRANCH}/DATA_DICTIONARY.md`,
  licence: `${REPO_URL}/blob/${REPO_BRANCH}/LICENSE.md`,
  citation: `${REPO_URL}/blob/${REPO_BRANCH}/CITATION.cff`,
  version: `${REPO_URL}/blob/${REPO_BRANCH}/VERSION.md`,
}

export const UPSTREAM_URL = 'https://jicheng.tw/tcm/index.html'

/** Archived deposit of record. Cite this DOI rather than the repository URL. */
export const DOI = '10.5281/zenodo.21889089'
export const DOI_URL = `https://doi.org/${DOI}`
export const ZENODO_REPOSITORY = 'Zenodo'
