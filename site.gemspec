# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "site"
  spec.version       = "1.0.0"
  spec.authors       = ["Bobby Craig"]
  spec.email         = ["bobby_craig@intuit.com"]

  spec.summary       = "Personal site theme for bobbylcraig.com"
  spec.homepage      = "https://bobbylcraig.com"
  spec.license       = "MIT"

  spec.files = `git ls-files -z`.split("\x0").select do |f|
    f.match(%r{^_(includes|layouts|sass)/}i)
  end

  spec.add_runtime_dependency "jekyll", "~> 4.3"
  spec.add_runtime_dependency "jekyll-feed", "~> 0.17"
  spec.add_runtime_dependency "jekyll-seo-tag", "~> 2.9"
  spec.add_runtime_dependency "jekyll-sitemap", "~> 1.4"

  spec.add_development_dependency "bundler", ">= 2.3"
  spec.add_development_dependency "rake", "~> 13.0"
end
