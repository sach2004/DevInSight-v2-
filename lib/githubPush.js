import { Octokit } from 'octokit';


export default class GitHubPushService {
  constructor(token) {
    this.octokit = new Octokit({ auth: token });
  }

  /**
  
   * @param {string} owner 
   * @param {string} repo 
   * @returns {Promise<Object>} 
   */
  async getDefaultBranchRef(owner, repo) {
    try {
      
      const { data: repoData } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      const defaultBranch = repoData.default_branch;

      
      const { data: refData } = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      });

      return {
        ref: `refs/heads/${defaultBranch}`,
        sha: refData.object.sha,
        defaultBranch
      };
    } catch (error) {
      console.error('Error getting default branch reference:', error);
      throw new Error(`Failed to get branch reference: ${error.message}`);
    }
  }

  /**

   * @param {string} owner 
   * @param {string} repo 
   * @param {string} baseSha 
   * @param {string} branchName 
   * @returns {Promise<Object>} 
   */
  async createBranch(owner, repo, baseSha, branchName) {
    try {
      const { data } = await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      });

      return data;
    } catch (error) {
      console.error('Error creating branch:', error);
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  /**
 
   * @param {string} owner 
   * @param {string} repo 
   * @param {string} path 
   * @param {string} branch 
   * @returns {Promise<Object|null>} 
   */
  async getFileContent(owner, repo, path, branch) {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      return {
        sha: data.sha,
        content: Buffer.from(data.content, 'base64').toString('utf-8'),
      };
    } catch (error) {
      if (error.status === 404) {
       
        return null;
      }
      console.error('Error getting file content:', error);
      throw new Error(`Failed to get file content: ${error.message}`);
    }
  }

  /**
   * @param {string} owner 
   * @param {string} repo 
   * @param {string} filename 
   * @returns {Promise<string|null>} 
   */
  async findFilePath(owner, repo, filename) {
    try {
    
      const { data } = await this.octokit.rest.search.code({
        q: `filename:${filename} repo:${owner}/${repo}`,
      });

      if (data.items && data.items.length > 0) {
        return data.items[0].path;
      }
      
      return null;
    } catch (error) {
      console.error('Error searching for file:', error);
      return null;
    }
  }

  /**
   * @param {string} owner 
   * @param {string} repo 
   * @param {string} path 
   * @param {string} content 
   * @param {string} message 
   * @param {string} branch 
   * @param {string} [fileSha] 
   * @returns {Promise<Object>} 
   */
  async createOrUpdateFile(owner, repo, path, content, message, branch, fileSha = null) {
    try {
      const params = {
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
      };

    
      if (fileSha) {
        params.sha = fileSha;
      }

      const { data } = await this.octokit.rest.repos.createOrUpdateFileContents(params);
      return data;
    } catch (error) {
      console.error('Error creating/updating file:', error);
      throw new Error(`Failed to create/update file: ${error.message}`);
    }
  }

  /**
   * @param {string} owner 
   * @param {string} repo 
   * @param {string} head 
   * @param {string} base 
   * @param {string} title 
   * @param {string} body 
   * @returns {Promise<Object>} 
   */
  async createPullRequest(owner, repo, head, base, title, body) {
    try {
      const { data } = await this.octokit.rest.pulls.create({
        owner,
        repo,
        head,
        base,
        title,
        body,
      });

      return data;
    } catch (error) {
      console.error('Error creating pull request:', error);
      throw new Error(`Failed to create pull request: ${error.message}`);
    }
  }

  /**
   * @param {string} owner
   * @param {string} repo 
   * @param {string} path 
   * @returns {Promise<Array>} 
   */
  async getDirectoryContents(owner, repo, path = '') {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error getting directory contents:', error);
      return [];
    }
  }

  /**
   * @param {string} owner 
   * @param {string} repo 
   * @param {string} filename 
   * @param {string} fileType 
   * @returns {Promise<string>} 
   */
  async suggestFilePath(owner, repo, filename, fileType) {
   
    const directoryPatterns = {
      'js': ['src', 'lib', 'utils', 'helpers'],
      'jsx': ['src/components', 'components', 'src/pages', 'pages'],
      'ts': ['src', 'lib', 'utils', 'helpers'],
      'tsx': ['src/components', 'components', 'src/pages', 'pages'],
      'css': ['styles', 'css', 'src/styles'],
      'html': ['public', 'static', 'templates'],
      'api': ['api', 'src/api', 'pages/api'],
      'route': ['routes', 'src/routes']
    };

   
    const isRouteRelated = filename.toLowerCase().includes('route');
    if (isRouteRelated) {
      fileType = 'route';
    }

 
    const isApiRelated = filename.toLowerCase().includes('api');
    if (isApiRelated) {
      fileType = 'api';
    }

   
    const dirsToCheck = directoryPatterns[fileType] || ['src', 'lib', ''];

   
    for (const dir of dirsToCheck) {
      try {
        const contents = await this.getDirectoryContents(owner, repo, dir);
        
      
        if (contents.length > 0) {
          return dir ? `${dir}/${filename}` : filename;
        }
      } catch (error) {
        
        continue;
      }
    }

   
    return filename;
  }

  /**
   * @param {Object} params 
   * @param {string} params.owner 
   * @param {string} params.repo 
   * @param {string} params.path 
   * @param {string} params.content 
   * @param {string} params.message 
   * @param {string} params.branchName 
   * @param {string} params.prTitle 
   * @param {string} params.prBody 
   * @returns {Promise<Object>} 
   */
  async pushCodeWithPR(params) {
    const {
      owner,
      repo,
      path,
      content,
      message,
      branchName,
      prTitle,
      prBody
    } = params;

    try {
   
      const defaultBranchRef = await this.getDefaultBranchRef(owner, repo);
      
 
      await this.createBranch(owner, repo, defaultBranchRef.sha, branchName);
      
      
      const existingFile = await this.getFileContent(owner, repo, path, branchName);
      
     
      await this.createOrUpdateFile(
        owner,
        repo,
        path,
        content,
        message,
        branchName,
        existingFile?.sha
      );
      
      
      const pr = await this.createPullRequest(
        owner,
        repo,
        branchName,
        defaultBranchRef.defaultBranch,
        prTitle,
        prBody
      );
      
      return {
        success: true,
        pullRequestUrl: pr.html_url,
        branchName: branchName,
        path: path
      };
    } catch (error) {
      console.error('Error pushing code:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}