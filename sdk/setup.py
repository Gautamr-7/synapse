from setuptools import setup, find_packages

setup(
    name="synapse-sdk",
    version="0.1.0",
    description="Persistent memory OS for AI agents",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Synapse AI",
    url="https://synapse-aii.netlify.app",
    packages=find_packages(),
    py_modules=["synapse"],
    install_requires=["requests>=2.31.0"],
    python_requires=">=3.8",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Topic :: Software Development :: Libraries",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    keywords="ai agents memory llm langchain crewai autogen",
)
